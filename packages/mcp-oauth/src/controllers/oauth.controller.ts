import { createHmac, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  Next,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { seconds, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';
import { serializeError } from 'serialize-error-cjs';
import { OAUTH_ENDPOINTS } from '../constants/oauth.constants';
import type { IOAuthStore } from '../interfaces/io-auth-store.interface';
import {
  MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN,
  type McpOAuthModuleOptions,
  OAUTH_STORE_TOKEN,
} from '../mcp-oauth.module-definition';
import { ClientService } from '../services/client.service';
import { McpOAuthService } from '../services/mcp-oauth.service';
import { PassportUser, STRATEGY_NAME } from '../services/oauth-strategy.service';
import { normalizeError } from '../utils/normalize-error';

@Controller()
@UseGuards(ThrottlerGuard)
export class OAuthController {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    @Inject(MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN)
    private readonly options: McpOAuthModuleOptions,
    private readonly authService: McpOAuthService,
    private readonly clientService: ClientService,
    @Inject(OAUTH_STORE_TOKEN) private readonly store: IOAuthStore,
  ) {}

  @Get(OAUTH_ENDPOINTS.authorize)
  @Throttle({ auth: { limit: 3, ttl: seconds(60) } })
  public async authorize(
    @Query('response_type') responseType: string,
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @Query('state') state: string,
    @Query('scope') scope: string,
    @Query('resource') resource: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Next() next: NextFunction,
  ) {
    this.logger.debug({
      msg: 'Start oAuth autorization',
      clientId,
      redirectUri,
      resource,
    });

    if (responseType !== 'code') throw new BadRequestException('Invalid response type');
    if (!clientId) throw new BadRequestException('Missing client_id parameter');

    // Validate resource parameter according to RFC 8707
    // The resource parameter MUST identify the MCP server that the client intends to use the token with
    if (resource && resource !== this.options.resource) {
      this.logger.error({
        msg: 'Invalid resource parameter',
        requested: resource,
        expected: this.options.resource,
      });
      throw new BadRequestException('Invalid resource parameter');
    }

    const client = await this.clientService.getClient(clientId);
    if (!client) throw new BadRequestException('Invalid client_id parameter');

    const validRedirectUri = await this.clientService.validateRedirectUri(clientId, redirectUri);
    if (!validRedirectUri) throw new BadRequestException('Invalid redirect_uri parameter');

    const sessionId = randomBytes(32).toString('base64url');
    // This state is used to validate the callback between the MCP server and the third-party provider.
    // We bind it to the session using HMAC to prevent CSRF attacks
    const sessionNonce = randomBytes(32).toString('base64url');
    const sessionState = createHmac('sha256', this.options.hmacSecret)
      .update(`${sessionId}:${sessionNonce}`)
      .digest('base64url');

    await this.store.storeOAuthSession(sessionId, {
      sessionId,
      state: sessionState,
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      oauthState: state, // This is the PKCE state of the MCP client.
      scope,
      resource: resource || this.options.resource,
      expiresAt: Date.now() + this.options.oauthSessionExpiresIn,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: this.options.cookieSecure || process.env.NODE_ENV === 'production',
      maxAge: this.options.oauthSessionExpiresIn,
      sameSite: 'strict' as const,
      path: '/auth',
      ...(this.options.cookieDomain && { domain: this.options.cookieDomain }),
    };

    response.cookie('oauth_session', sessionId, cookieOptions);
    response.cookie('oauth_state', sessionState, cookieOptions);

    const authMiddleware = passport.authenticate(STRATEGY_NAME, {
      state: sessionState,
    });

    this.logger.debug({
      msg: 'Redirecting to authorization server. New session created.',
      redirectUri,
      sessionId,
    });

    authMiddleware(request, response, next);
  }

  @Get(OAUTH_ENDPOINTS.callback)
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  public async callback(
    @Req() request: Request & { sessionId: string; sessionState: string },
    @Res() response: Response,
    @Next() next: NextFunction,
  ) {
    this.logger.debug({
      msg: 'Callback from authorization server.',
      sessionId: request.sessionId,
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

          this.logger.debug({ msg: 'User authenticated.' });

          request.user = user;
          const { redirectUrl } = await this.authService.processAuthenticationSuccess({
            user,
            sessionId: request.cookies?.oauth_session,
            sessionState: request.cookies?.oauth_state,
          });

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
}
