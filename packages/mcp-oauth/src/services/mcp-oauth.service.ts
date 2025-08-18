import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { type IntrospectionResponse, type IntrospectRequestDto } from '../dtos/introspect-request.dto';
import { type RevokeRequestDto } from '../dtos/revoke-request.dto';
import { TokenRequestDto } from '../dtos/token-request.dto';
import type { IOAuthStore } from '../interfaces/io-auth-store.interface';
import { OAuthClient } from '../interfaces/oauth-client.interface';
import {
  MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN,
  type McpOAuthModuleOptions,
  OAUTH_STORE_TOKEN,
} from '../mcp-oauth.module-definition';
import { PassportUser } from './oauth-strategy.service';
import { OpaqueTokenService } from './opaque-token.service';

@Injectable()
export class McpOAuthService {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    @Inject(MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN) private readonly options: McpOAuthModuleOptions,
    @Inject(OAUTH_STORE_TOKEN) private readonly store: IOAuthStore,
    private readonly tokenService: OpaqueTokenService,
  ) {}

  public async processAuthenticationSuccess({
    user,
    sessionId,
    sessionState,
  }: {
    user: PassportUser;
    sessionId: string;
    sessionState: string;
  }) {
    this.logger.debug({
      msg: 'Processing authentication success',
      user: user.profile.username,
      sessionId,
      sessionState,
    });

    if (!user) throw new UnauthorizedException('Authentication failed');
    if (!sessionId) throw new UnauthorizedException('Authentication failed');

    const session = await this.store.getOAuthSession(sessionId);
    if (!session) throw new UnauthorizedException('Invalid or expired OAuth session.');
    if (
      !session.clientId ||
      !session.redirectUri ||
      !session.codeChallenge ||
      !session.codeChallengeMethod
    )
      throw new UnauthorizedException('Invalid or expired OAuth session.');

    if (session.state !== sessionState) throw new UnauthorizedException('Invalid state.');

    const userProfileId = await this.store.upsertUserProfile(user);
    const authCode = randomBytes(32).toString('base64url');

    this.logger.debug({
      msg: 'Session PKCE validated, user profile upserted, auth code generated.',
      userProfileId,
      sessionId: session.sessionId,
      sessionState: session.state,
      oauthState: session.oauthState,
    });

    await this.store.storeAuthCode({
      code: authCode,
      user_id: user.profile.username,
      client_id: session.clientId,
      redirect_uri: session.redirectUri,
      code_challenge: session.codeChallenge,
      code_challenge_method: session.codeChallengeMethod,
      expires_at: Date.now() + this.options.authCodeExpiresIn,
      resource: session.resource,
      scope: session.scope,
      user_profile_id: userProfileId,
    });

    // Build redirect URL with authorization code
    const redirectUrl = new URL(session.redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (session.oauthState) redirectUrl.searchParams.set('state', session.oauthState);

    // Clean up session
    await this.store.removeOAuthSession(sessionId);

    return {
      redirectUrl: redirectUrl.toString(),
    };
  }

  public async exchangeAuthorizationCodeForToken(tokenDto: TokenRequestDto) {
    const { code, client_id, client_secret, code_verifier, resource } = tokenDto;

    // 1. Validate the authorization code
    if (!code) throw new BadRequestException('Missing code parameter');
    const authCode = await this.store.getAuthCode(code);
    if (!authCode) {
      this.logger.error({
        msg: 'Invalid or expired authorization code',
        code,
      });
      throw new BadRequestException('Invalid or expired authorization code');
    }

    if (authCode.expires_at < Date.now()) {
      await this.store.removeAuthCode(code);
      this.logger.error({
        msg: 'Authorization code expired',
        code,
      });
      throw new BadRequestException('Invalid or expired authorization code');
    }

    if (authCode.client_id !== client_id) {
      this.logger.error({
        msg: 'Authorization code does not belong to the client',
        code,
        client_id,
      });
      throw new BadRequestException('Client ID mismatch');
    }

    if (!authCode.resource) {
      this.logger.error({
        msg: 'Authorization code is not associated with a resource',
        code,
        client_id,
      });
      throw new BadRequestException('Authorization code is not associated with a resource');
    }

    // Validate resource parameter according to RFC 8707
    // If the client includes a resource parameter, it must match the one from the authorization request
    if (resource && resource !== authCode.resource) {
      this.logger.error({
        msg: 'Resource parameter mismatch',
        requested: resource,
        expected: authCode.resource,
      });
      throw new BadRequestException('Resource parameter mismatch');
    }

    // 2. Validate the code against the registered client
    const client = await this.store.getClient(client_id);
    if (!client) {
      this.logger.error({
        msg: 'Client not found',
        client_id,
      });
      throw new BadRequestException('Invalid client');
    }
    this.validateClientAuthentication(client, client_secret);

    // 3. Validate the PKCE if it's present
    if (authCode.code_challenge) {
      if (!code_verifier) throw new BadRequestException('Invalid request');
      const isValid = this.validatePKCE(
        code_verifier,
        authCode.code_challenge,
        authCode.code_challenge_method,
      );
      if (!isValid) {
        this.logger.error({
          msg: 'PKCE validation failed',
          code_challenge_method: authCode.code_challenge_method,
        });
        throw new BadRequestException('Invalid request');
      }
    }

    // 4. Generate tokens
    const tokenPair = await this.tokenService.generateTokenPair(
      authCode.user_id,
      client_id,
      authCode.scope,
      authCode.resource,
      authCode.user_profile_id,
    );

    // 5. Clean up the authorization code
    await this.store.removeAuthCode(code);

    this.logger.debug({
      msg: 'Token pair generated',
      userId: authCode.user_id,
    });

    return tokenPair;
  }

  public async exchangeRefreshTokenForToken(tokenDto: TokenRequestDto) {
    const { refresh_token, client_id, client_secret } = tokenDto;

    if (!refresh_token) throw new BadRequestException('Missing refresh_token parameter');

    const client = await this.store.getClient(client_id);
    if (!client) throw new BadRequestException('Invalid client');
    this.validateClientAuthentication(client, client_secret);

    if (client.client_id !== client_id)
      throw new BadRequestException(
        'Invalid refresh token or token does not belong to this client',
      );

    const tokenPair = await this.tokenService.refreshAccessToken(refresh_token, client_id);
    if (!tokenPair) throw new BadRequestException('Invalid or expired refresh token');

    return tokenPair;
  }

  /**
   * Introspect a token to determine its current state and metadata.
   * Implements RFC 7662: OAuth 2.0 Token Introspection
   * 
   * Security: Only allows introspection by the client that the token was issued to.
   */
  public async introspectToken(introspectDto: IntrospectRequestDto): Promise<IntrospectionResponse> {
    const { token, token_type_hint, client_id, client_secret } = introspectDto;

    // Validate client authentication
    const client = await this.store.getClient(client_id);
    if (!client) {
      this.logger.warn({ msg: 'Invalid client attempting introspection', client_id });
      return { active: false };
    }

    try {
      this.validateClientAuthentication(client, client_secret);
    } catch (error) {
      this.logger.warn({ 
        msg: 'Client authentication failed for introspection', 
        client_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { active: false };
    }

    // Try to introspect as access token first (unless hint says otherwise)
    if (!token_type_hint || token_type_hint === 'access_token') {
      const accessTokenResult = await this.tokenService.validateAccessToken(token);
      
      if (accessTokenResult) {
        // Security check: Only allow introspection by the client that owns the token
        if (accessTokenResult.clientId !== client_id) {
          this.logger.warn({ 
            msg: 'Client attempted to introspect token belonging to another client',
            requesting_client: client_id,
            token_client: accessTokenResult.clientId
          });
          return { active: false };
        }

        return {
          active: true,
          scope: accessTokenResult.scope,
          client_id: accessTokenResult.clientId,
          username: accessTokenResult.userId,
          token_type: 'Bearer',
          // Additional metadata
          resource: accessTokenResult.resource,
          user_profile_id: accessTokenResult.userProfileId,
          // Note: We don't have exp/iat/nbf for opaque tokens
          // If we switch to JWT, we would include these
        };
      }
    }

    // Try as refresh token if not found as access token
    if (!token_type_hint || token_type_hint === 'refresh_token') {
      const refreshTokenResult = await this.tokenService.validateRefreshToken(token);
      
      if (refreshTokenResult) {
        // Security check: Only allow introspection by the client that owns the token
        if (refreshTokenResult.clientId !== client_id) {
          this.logger.warn({ 
            msg: 'Client attempted to introspect refresh token belonging to another client',
            requesting_client: client_id,
            token_client: refreshTokenResult.clientId
          });
          return { active: false };
        }

        return {
          active: true,
          scope: refreshTokenResult.scope,
          client_id: refreshTokenResult.clientId,
          username: refreshTokenResult.userId,
          token_type: 'refresh_token',
          // Additional metadata
          resource: refreshTokenResult.resource,
          user_profile_id: refreshTokenResult.userProfileId,
        };
      }
    }

    // Token not found or expired
    return { active: false };
  }

  /**
   * Revoke a token to invalidate it immediately.
   * Implements RFC 7009: OAuth 2.0 Token Revocation
   * 
   * Security: Only allows revocation by the client that the token was issued to.
   * Note: Revocation is idempotent - revoking an already revoked token is a no-op.
   */
  public async revokeToken(revokeDto: RevokeRequestDto): Promise<void> {
    const { token, token_type_hint, client_id, client_secret } = revokeDto;

    // Validate client authentication
    const client = await this.store.getClient(client_id);
    if (!client) {
      this.logger.warn({ msg: 'Invalid client attempting revocation', client_id });
      // Per RFC 7009, we don't indicate errors
      return;
    }

    try {
      this.validateClientAuthentication(client, client_secret);
    } catch (error) {
      this.logger.warn({ 
        msg: 'Client authentication failed for revocation', 
        client_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Per RFC 7009, we don't indicate errors
      return;
    }

    // Try to revoke as access token first (unless hint says otherwise)
    if (!token_type_hint || token_type_hint === 'access_token') {
      const accessTokenResult = await this.tokenService.validateAccessToken(token);
      
      if (accessTokenResult) {
        // Security check: Only allow revocation by the client that owns the token
        if (accessTokenResult.clientId !== client_id) {
          this.logger.warn({ 
            msg: 'Client attempted to revoke token belonging to another client',
            requesting_client: client_id,
            token_client: accessTokenResult.clientId
          });
          return;
        }

        // Revoke the access token
        await this.store.removeAccessToken(token);
        this.logger.log({
          msg: 'Access token revoked',
          clientId: client_id,
          tokenPrefix: token.substring(0, 8),
        });
        return;
      }
    }

    // Try as refresh token if not found as access token
    if (!token_type_hint || token_type_hint === 'refresh_token') {
      const refreshTokenResult = await this.tokenService.validateRefreshToken(token);
      
      if (refreshTokenResult) {
        // Security check: Only allow revocation by the client that owns the token
        if (refreshTokenResult.clientId !== client_id) {
          this.logger.warn({ 
            msg: 'Client attempted to revoke refresh token belonging to another client',
            requesting_client: client_id,
            token_client: refreshTokenResult.clientId
          });
          return;
        }

        // Revoke the refresh token (and any associated access tokens would be handled here)
        await this.store.removeRefreshToken(token);
        this.logger.log({
          msg: 'Refresh token revoked',
          clientId: client_id,
          tokenPrefix: token.substring(0, 8),
        });
        return;
      }
    }

    // Token not found or already revoked - this is still a success per RFC 7009
    this.logger.debug({
      msg: 'Token revocation attempted for non-existent or already revoked token',
      clientId: client_id,
    });
  }

  private validateClientAuthentication(client: OAuthClient, clientSecret?: string) {
    const { token_endpoint_auth_method } = client;

    switch (token_endpoint_auth_method) {
      case 'client_secret_basic':
      case 'client_secret_post':
        if (!clientSecret)
          throw new BadRequestException('Client secret required for this authentication method');
        if (client.client_secret !== clientSecret)
          throw new BadRequestException('Invalid client credentials');
        break;
      case 'none':
        if (clientSecret)
          throw new BadRequestException('Client secret not allowed for public clients');
        break;
      default:
        throw new BadRequestException(
          `Unsupported authentication method: ${token_endpoint_auth_method}`,
        );
    }
  }

  private validatePKCE(codeVerifier: string, codeChallenge: string, codeChallengeMethod: string) {
    if (codeChallengeMethod === 'plain') return codeVerifier === codeChallenge;
    if (codeChallengeMethod === 'S256') {
      const hash = createHash('sha256').update(codeVerifier).digest('base64url');
      return hash === codeChallenge;
    }
    return false;
  }
}
