import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { McpModule } from '@rekog/mcp-nest';
import { LoggerModule } from '@unique-ag/logger';
import { typeid } from 'typeid-js';
import { AppConfig, AppSettings, validateConfig } from './app-settings.enum';
import { AuthModule } from './auth/auth.module';
import { McpAuthJwtGuard } from './auth/guards/mcp-auth-jwt.guard';
import { MicrosoftOAuthProvider } from './auth/microsoft.provider';
import { GreetingTool } from './greeting.tool';
import { OutlookModule } from './outlook/outlook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    LoggerModule.forRootAsync({}),
    AuthModule.forRootAsync({
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        provider: MicrosoftOAuthProvider,
        clientId: configService.get(AppSettings.MICROSOFT_CLIENT_ID),
        clientSecret: configService.get(AppSettings.MICROSOFT_CLIENT_SECRET),
        jwtSecret: configService.get(AppSettings.JWT_SECRET),
        serverUrl: configService.get(AppSettings.SELF_URL),
        resource: configService.get(AppSettings.SELF_URL),
      }),
      inject: [ConfigService],
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
    OutlookModule,
  ],
  controllers: [],
  providers: [
    GreetingTool,
    {
      provide: APP_GUARD,
      useClass: McpAuthJwtGuard,
    },
  ],
})
export class AppModule {}
