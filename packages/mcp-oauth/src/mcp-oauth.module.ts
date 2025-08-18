import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { McpAuthJwtGuard } from './guards/mcp-auth-jwt.guard';
import { McpOAuthController } from './mcp-oauth.controller';
import {
  ConfigurableModuleClass,
  ENCRYPTION_SERVICE_TOKEN,
  MCP_OAUTH_MODULE_ASYNC_OPTIONS_TYPE,
  MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN,
  MCP_OAUTH_MODULE_OPTIONS_TOKEN,
  type McpOAuthModuleOptions,
  type McpOAuthModuleOptionsInput,
  mcpOAuthModuleOptionsSchema,
  OAUTH_STORE_TOKEN,
} from './mcp-oauth.module-definition';
import { ClientService } from './services/client.service';
import { JwtTokenService } from './services/jwt-token.service';
import { McpOAuthService } from './services/mcp-oauth.service';
import { OAuthStrategyService } from './services/oauth-strategy.service';

/**
 * Modular AuthModule that supports dependency injection for storage and encryption.
 * This module uses the standard NestJS async configuration pattern.
 *
 * The module expects the following to be provided via the options:
 * - oauthStore: An instance of IOAuthStore for persistent storage
 * - encryptionService: An instance of IEncryptionService for encryption
 *
 * Example usage:
 * ```typescript
 * AuthModule.forRootAsync({
 *   imports: [PrismaModule, AesGcmEncryptionModule],
 *   useFactory: (prisma: PrismaService, encryption: AesGcmEncryptionService) => ({
 *     // OAuth configuration
 *     provider: MicrosoftProvider,
 *     clientId: 'your-client-id',
 *     clientSecret: 'your-client-secret',
 *     jwtSecret: 'your-jwt-secret',
 *     // Services
 *     oauthStore: new McpOAuthStore(prisma, new AesGcmEncryptionAdapter(encryption)),
 *     encryptionService: new AesGcmEncryptionAdapter(encryption),
 *   }),
 *   inject: [PrismaService, AesGcmEncryptionService],
 * })
 * ```
 */
@Module({})
export class McpOAuthModule extends ConfigurableModuleClass {
  public static forRootAsync(options: typeof MCP_OAUTH_MODULE_ASYNC_OPTIONS_TYPE): DynamicModule {
    // biome-ignore lint/complexity/noThisInStatic: That's how NestJS extends the pre-configured rootAsync method.
    const baseModule = super.forRootAsync(options);

    const providers: Provider[] = [
      {
        provide: MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN,
        useFactory: (rawOptions: McpOAuthModuleOptionsInput) =>
          mcpOAuthModuleOptionsSchema.parse(rawOptions),
        inject: [MCP_OAUTH_MODULE_OPTIONS_TOKEN],
      },
      McpOAuthService,
      ClientService,
      JwtTokenService,
      OAuthStrategyService,
      McpAuthJwtGuard,
      {
        provide: OAUTH_STORE_TOKEN,
        useFactory: (moduleOptions: McpOAuthModuleOptions) => {
          if (!moduleOptions.oauthStore) {
            throw new Error(
              'OAuth store is required. Please provide an oauthStore instance in the module options.',
            );
          }
          return moduleOptions.oauthStore;
        },
        inject: [MCP_OAUTH_MODULE_OPTIONS_TOKEN],
      },
      {
        provide: ENCRYPTION_SERVICE_TOKEN,
        useFactory: (moduleOptions: McpOAuthModuleOptions) => {
          if (!moduleOptions.encryptionService) {
            throw new Error(
              'Encryption service is required. Please provide an encryptionService instance in the module options.',
            );
          }
          return moduleOptions.encryptionService;
        },
        inject: [MCP_OAUTH_MODULE_OPTIONS_TOKEN],
      },
    ];

    return {
      ...baseModule,
      module: McpOAuthModule,
      controllers: [McpOAuthController],
      providers: [...(baseModule.providers || []), ...providers],
      exports: [
        JwtTokenService,
        McpAuthJwtGuard,
        OAUTH_STORE_TOKEN,
        ENCRYPTION_SERVICE_TOKEN,
        MCP_OAUTH_MODULE_OPTIONS_TOKEN,
        MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN,
      ],
    };
  }
}
