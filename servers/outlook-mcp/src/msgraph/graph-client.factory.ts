import { Client, ClientOptions, MiddlewareFactory } from '@microsoft/microsoft-graph-client';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig, AppSettings } from '../app-settings.enum';
import { SCOPES } from '../auth/microsoft.provider';
import { PrismaService } from '../prisma/prisma.service';
import { TokenProvider } from './token.provider';
import { TokenRefreshMiddleware } from './token-refresh.middleware';

@Injectable()
export class GraphClientFactory {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scopes: string[];

  public constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    this.clientId = this.configService.get(AppSettings.MICROSOFT_CLIENT_ID);
    this.clientSecret = this.configService.get(AppSettings.MICROSOFT_CLIENT_SECRET);
    this.scopes = SCOPES;
  }

  public createClientForUser(userProfileId: string): Client {
    const tokenProvider = new TokenProvider(
      this.prisma,
      userProfileId,
      this.clientId,
      this.clientSecret,
      this.scopes,
    );

    // Get the default middleware chain as an array
    const defaultMiddlewares = MiddlewareFactory.getDefaultMiddlewareChain(tokenProvider);

    // Create our custom TokenRefreshMiddleware
    const tokenRefreshMiddleware = new TokenRefreshMiddleware(tokenProvider, userProfileId);

    // Insert TokenRefreshMiddleware at position 1 (after AuthenticationHandler, before RetryHandler)
    // This ensures token refresh happens before the built-in retry logic
    defaultMiddlewares.splice(1, 0, tokenRefreshMiddleware);

    // Chain the middlewares together by setting next on each one
    for (let i = 0; i < defaultMiddlewares.length - 1; i++) {
      const currentMiddleware = defaultMiddlewares[i];
      const nextMiddleware = defaultMiddlewares[i + 1];

      if (currentMiddleware?.setNext && nextMiddleware) currentMiddleware.setNext(nextMiddleware);
    }

    // Pass the first middleware in the chain to initialize the client
    const clientOptions: ClientOptions = {
      middleware: defaultMiddlewares[0],
      debugLogging: this.configService.get(AppSettings.LOG_LEVEL, { infer: true }) === 'debug',
    };

    return Client.initWithMiddleware(clientOptions);
  }
}
