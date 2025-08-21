import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AesGcmEncryptionModule, AesGcmEncryptionService } from '@unique-ag/aes-gcm-encryption';
import { LoggerModule } from '@unique-ag/logger';
import { McpAuthJwtGuard, McpOAuthModule } from '@unique-ag/mcp-oauth';
import { McpModule } from '@unique-ag/mcp-server-module';
import { Cache } from 'cache-manager';
import { typeid } from 'typeid-js';
import { AppConfig, AppSettings, validateConfig } from './app-settings.enum';
import { McpOAuthStore } from './auth/mcp-oauth.store';
import { MicrosoftOAuthProvider } from './auth/microsoft.provider';
import { MsGraphModule } from './msgraph/msgraph.module';
import { OutlookModule } from './outlook/outlook.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    LoggerModule.forRootAsync({}),
    AesGcmEncryptionModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        key: configService.get(AppSettings.ENCRYPTION_KEY),
      }),
      inject: [ConfigService],
    }),
    CacheModule.register({
      isGlobal: true,
    }),
    McpOAuthModule.forRootAsync({
      imports: [ConfigModule, PrismaModule],
      useFactory: async (
        configService: ConfigService<AppConfig, true>,
        aesService: AesGcmEncryptionService,
        prisma: PrismaService,
        cacheManager: Cache,
      ) => ({
        provider: MicrosoftOAuthProvider,

        clientId: configService.get(AppSettings.MICROSOFT_CLIENT_ID),
        clientSecret: configService.get(AppSettings.MICROSOFT_CLIENT_SECRET),
        hmacSecret: configService.get(AppSettings.HMAC_SECRET),

        serverUrl: configService.get(AppSettings.SELF_URL),
        resource: `${configService.get(AppSettings.SELF_URL)}/mcp`,

        accessTokenExpiresIn: configService.get(AppSettings.ACCESS_TOKEN_EXPIRES_IN_SECONDS),
        refreshTokenExpiresIn: configService.get(AppSettings.REFRESH_TOKEN_EXPIRES_IN_SECONDS),

        oauthStore: new McpOAuthStore(prisma, aesService, cacheManager),
        encryptionService: aesService,
      }),
      inject: [ConfigService, AesGcmEncryptionService, PrismaService, CACHE_MANAGER],
    }),
    McpModule.forRoot({
      name: 'outlook-mcp',
      version: '0.0.1',
      streamableHttp: {
        enableJsonResponse: false,
        sessionIdGenerator: () => typeid('session').toString(),
        statelessMode: false,
      },
    }),
    MsGraphModule,
    OutlookModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: McpAuthJwtGuard,
    },
  ],
})
export class AppModule {}
