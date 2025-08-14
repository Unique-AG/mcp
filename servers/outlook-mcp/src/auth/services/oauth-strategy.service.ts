import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OAuthUserProfile } from '@rekog/mcp-nest';
import passport from 'passport';
import { OAUTH_ENDPOINTS } from '../auth.controller';
import { AUTH_MODULE_OPTIONS_TOKEN, type AuthModuleOptions } from '../auth.module-definition';

export const STRATEGY_NAME = 'oauth-provider';

export interface PassportUser {
  profile: OAuthUserProfile;
  accessToken: string;
  refreshToken: string;
  provider: string;
}

@Injectable()
export class OAuthStrategyService implements OnModuleInit {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    @Inject(AUTH_MODULE_OPTIONS_TOKEN) private readonly options: AuthModuleOptions,
  ) {}

  public onModuleInit() {
    this.registerStrategy();
  }

  private registerStrategy() {
    this.logger.log({
      msg: 'Registering OAuth strategy',
      provider: this.options.provider.name,
      clientId: this.options.clientId,
      serverUrl: this.options.serverUrl,
    });

    const provider = this.options.provider;

    // Use client credentials from resolved options
    const clientId = this.options.clientId;
    const clientSecret = this.options.clientSecret;

    // Use resolved serverUrl (no fallbacks needed)
    const serverUrl = this.options.serverUrl;

    const strategyOptions = provider.strategyOptions({
      serverUrl,
      clientId,
      clientSecret,
      callbackPath: OAUTH_ENDPOINTS.callback,
    });

    const strategy = new provider.strategy(
      strategyOptions,
      (
        accessToken: string,
        refreshToken: string,
        profile: unknown,
        done: (error: unknown, user: unknown) => void,
      ) => {
        try {
          const mappedProfile = provider.profileMapper(profile);
          const result: PassportUser = {
            profile: mappedProfile,
            accessToken,
            refreshToken,
            provider: provider.name,
          };

          return done(null, result);
        } catch (error) {
          return done(error, null);
        }
      },
    );

    passport.use(STRATEGY_NAME, strategy);
  }

  public getStrategyName(): string {
    return STRATEGY_NAME;
  }
}
