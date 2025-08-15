import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Next,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import passport from 'passport';
import { serializeError } from 'serialize-error-cjs';
import { normalizeError } from '../utils/normalize-error';
import { AUTH_MODULE_OPTIONS_TOKEN, type AuthModuleOptions } from './auth.module-definition';
import { RegisterClientDto } from './dtos/register-client.dto';
import { TokenRequestDto } from './dtos/token-request.dto';
import { McpOAuthStore } from './mcp-oauth.store';
import { AuthService } from './services/auth.service';
import { ClientService } from './services/client.service';
import { PassportUser, STRATEGY_NAME } from './services/oauth-strategy.service';

export const OAUTH_ENDPOINTS = {
  authorize: '/auth/authorize',
  callback: '/auth/callback',
  register: '/auth/register',
  token: '/auth/token',
  revoke: '/auth/revoke',
};

@Controller()
export class AuthController {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    @Inject(AUTH_MODULE_OPTIONS_TOKEN) private readonly options: AuthModuleOptions,
    private readonly authService: AuthService,
    private readonly clientService: ClientService,
    private readonly store: McpOAuthStore,
  ) {}

  /*
   * TODO: Extend this with more additional metadata.
   * TODO: Move well-known endpoints to a separate controller.
   *
   * For example:
   *
   * {
   *   "jwks_uri": "https://mcp.example.com/.well-known/jwks.json",
   *   "resource_name": "Example MCP Server",
   *   "resource_documentation": "https://docs.example.com/mcp",
   *   "resource_policy_uri": "https://example.com/policy",
   *   "resource_tos_uri": "https://example.com/tos",
   *   "resource_signing_alg_values_supported": ["RS256"],
   *   "tls_client_certificate_bound_access_tokens": false,
   *   "dpop_bound_access_tokens_required": false
   * }
   */
  @Get('.well-known/oauth-protected-resource')
  public getProtectedResourceMetadata() {
    const metadata = {
      authorization_servers: [this.options.jwtIssuer],
      resource: this.options.resource,
      scopes_supported: this.options.protectedResourceMetadata.scopesSupported,
      bearer_methods_supported: this.options.protectedResourceMetadata.bearerMethodsSupported,
      mcp_versions_supported: this.options.protectedResourceMetadata.mcpVersionsSupported,
    };

    return metadata;
  }

  @Get('.well-known/oauth-authorization-server')
  public getAuthorizationServerMetadata() {
    return {
      issuer: this.options.serverUrl,
      authorization_endpoint: `${this.options.serverUrl}${OAUTH_ENDPOINTS.authorize}`,
      token_endpoint: `${this.options.serverUrl}${OAUTH_ENDPOINTS.token}`,
      registration_endpoint: `${this.options.serverUrl}${OAUTH_ENDPOINTS.register}`,
      response_types_supported: this.options.authorizationServerMetadata.responseTypesSupported,
      response_modes_supported: this.options.authorizationServerMetadata.responseModesSupported,
      grant_types_supported: this.options.authorizationServerMetadata.grantTypesSupported,
      token_endpoint_auth_methods_supported:
        this.options.authorizationServerMetadata.tokenEndpointAuthMethodsSupported,
      scopes_supported: this.options.authorizationServerMetadata.scopesSupported,
      revocation_endpoint: `${this.options.serverUrl}${OAUTH_ENDPOINTS.revoke}`,
      code_challenge_methods_supported:
        this.options.authorizationServerMetadata.codeChallengeMethodsSupported,
    };
  }

  @Post(OAUTH_ENDPOINTS.register)
  @UsePipes(ZodValidationPipe)
  public async registerClient(@Body() registerClientDto: RegisterClientDto) {
    return this.clientService.registerClient(registerClientDto);
  }

  @Get(OAUTH_ENDPOINTS.authorize)
  public async authorize(
    @Query('response_type') responseType: string,
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @Query('state') state: string,
    @Query('scope') scope: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Next() next: NextFunction,
  ) {
    this.logger.debug({
      msg: 'Start oAuth autorization',
      clientId,
      redirectUri,
    });

    if (responseType !== 'code') throw new BadRequestException('Invalid response type');
    if (!clientId) throw new BadRequestException('Missing client_id parameter');

    const client = await this.clientService.getClient(clientId);
    if (!client) throw new BadRequestException('Invalid client_id parameter');

    const validRedirectUri = await this.clientService.validateRedirectUri(clientId, redirectUri);
    if (!validRedirectUri) throw new BadRequestException('Invalid redirect_uri parameter');

    // Create OAuth session
    const sessionId = randomBytes(32).toString('base64url');
    // This state is used to validate the callback between the MCP server and the third-party provider.
    const sessionState = randomBytes(32).toString('base64url');

    await this.store.storeOAuthSession(sessionId, {
      sessionId,
      state: sessionState,
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      oauthState: state, // This is the PKCE state of the MCP client.
      scope,
      resource: this.options.resource,
      expiresAt: Date.now() + this.options.oauthSessionExpiresIn,
    });

    response.cookie('oauth_session', sessionId, {
      httpOnly: true,
      secure: this.options.cookieSecure,
      maxAge: this.options.oauthSessionExpiresIn,
      sameSite: 'lax',
    });

    // Store state for passport
    response.cookie('oauth_state', sessionState, {
      httpOnly: true,
      secure: this.options.cookieSecure,
      maxAge: this.options.oauthSessionExpiresIn,
      sameSite: 'lax',
    });

    const authMiddleware = passport.authenticate(STRATEGY_NAME, {
      state: sessionState,
    });

    this.logger.debug({
      msg: 'Redirecting to authorization server. New session created.',
      redirectUri,
      sessionId,
      sessionState,
      oauthState: state,
    });

    authMiddleware(request, response, next);
  }

  @Get(OAUTH_ENDPOINTS.callback)
  public async callback(
    @Req() request: Request & { sessionId: string; sessionState: string },
    @Res() response: Response,
    @Next() next: NextFunction,
  ) {
    this.logger.debug({
      msg: 'Callback from authorization server.',
      sessionId: request.sessionId,
      sessionState: request.sessionState,
    });

    const authMiddleware = passport.authenticate(
      STRATEGY_NAME,
      { session: false },
      async (error: unknown, user: PassportUser) => {
        try {
          if (error) {
            this.logger.error({
              msg: 'Failed to authenticate user',
              error: serializeError(normalizeError(error)),
            });
            throw new UnauthorizedException('Authentication failed');
          }

          if (!user) throw new UnauthorizedException('Authentication failed');

          this.logger.debug({
            msg: 'User authenticated.',
            user,
          });

          request.user = user;
          const { redirectUrl } = await this.authService.processAuthenticationSuccess({
            user,
            sessionId: request.cookies?.oauth_session,
            sessionState: request.cookies?.oauth_state,
          });

          // Clear temporary cookies
          response.clearCookie('oauth_session');
          response.clearCookie('oauth_state');

          this.logger.debug({
            msg: 'User JWT created and oauth session cleared. Redirecting the user back to the MCP client.',
            redirectUrl,
          });

          return response.redirect(redirectUrl);
        } catch (error) {
          this.logger.error({
            msg: 'Failed to authenticate user',
            error: serializeError(normalizeError(error)),
          });

          return response.status(HttpStatus.UNAUTHORIZED).json({
            error: 'Authentication failed',
            error_description: 'Authentication failed',
          });
        }
      },
    );

    authMiddleware(request, response, next);
  }

  @Post(OAUTH_ENDPOINTS.token)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @HttpCode(HttpStatus.OK)
  @UsePipes(ZodValidationPipe)
  public async token(@Body() tokenDto: TokenRequestDto) {
    this.logger.debug({
      msg: 'Token exchange request',
      grantType: tokenDto.grant_type,
    });

    switch (tokenDto.grant_type) {
      case 'authorization_code':
        return this.authService.exchangeAuthorizationCodeForToken(tokenDto);
      case 'refresh_token':
        return this.authService.exchangeRefreshTokenForToken(tokenDto);
      default:
        throw new BadRequestException(`Unsupported grant type ${tokenDto.grant_type}`);
    }
  }
}
