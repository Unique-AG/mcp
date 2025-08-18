import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenRequestDto } from '../dtos/token-request.dto';
import type { IOAuthStore } from '../interfaces/io-auth-store.interface';
import { OAuthClient } from '../interfaces/oauth-client.interface';
import {
  MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN as MCP_OAUTH_MODULE_OPTIONS_TOKEN,
  type McpOAuthModuleOptions,
  OAUTH_STORE_TOKEN,
} from '../mcp-oauth.module-definition';
import { JwtTokenService } from './jwt-token.service';
import { PassportUser } from './oauth-strategy.service';

@Injectable()
export class McpOAuthService {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    @Inject(MCP_OAUTH_MODULE_OPTIONS_TOKEN) private readonly options: McpOAuthModuleOptions,
    @Inject(OAUTH_STORE_TOKEN) private readonly store: IOAuthStore,
    private readonly jwtTokenService: JwtTokenService,
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
      github_access_token: '',
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
    const { code, client_id, client_secret, code_verifier } = tokenDto;

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
    const userProfile = authCode.user_profile_id
      ? await this.store.getUserProfileById(authCode.user_profile_id)
      : undefined;

    const tokenPair = this.jwtTokenService.generateTokenPair(
      authCode.user_id,
      client_id,
      authCode.scope,
      authCode.resource,
      {
        user_profile_id: authCode.user_profile_id,
        user_data: userProfile,
      },
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

    const tokenPair = this.jwtTokenService.refreshAccessToken(refresh_token, client_id);
    if (!tokenPair) throw new BadRequestException('Invalid or expired refresh token');

    return tokenPair;
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
