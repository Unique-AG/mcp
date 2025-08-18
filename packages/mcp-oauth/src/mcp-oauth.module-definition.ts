import { ConfigurableModuleBuilder } from '@nestjs/common';
import { z } from 'zod';
import { oauthUserProfileSchema } from './interfaces/oauth-provider.interface';

export const mcpOAuthModuleOptionsSchema = z.object({
  provider: z.object({
    name: z.string(),
    displayName: z.string().optional(),
    strategy: z.any().describe('The passport strategy to use for authentication.'),
    strategyOptions: z
      .function()
      .args(
        z.object({
          serverUrl: z.string(),
          clientId: z.string(),
          clientSecret: z.string(),
          callbackPath: z.string().optional(),
        }),
      )
      .returns(z.any())
      .describe('A factory function that returns the strategy options.'),
    profileMapper: z
      .function()
      .args(z.any())
      .returns(oauthUserProfileSchema)
      .describe('A function that maps the profile from the strategy to the user profile.'),
  }),

  // Required OAuth Provider Credentials
  clientId: z.string().describe('The client ID of the OAuth provider.'),
  clientSecret: z.string().describe('The client secret of the OAuth provider.'),

  // Required JWT Configuration
  jwtSecret: z.string().describe('The secret key for the MCP Server to sign JWT tokens.'),

  // Server Configuration
  serverUrl: z.string().url(),
  resource: z
    .string()
    .url()
    .describe("should be the endpoint clients connect to, e.g.: 'http://localhost:3000/mcp'"),

  // JWT Configuration
  jwtIssuer: z.string().url(),
  jwtAudience: z.string().default('mcp-client'),
  jwtAccessTokenExpiresIn: z
    .number()
    .default(60)
    .describe('The expiration time of the JWT access token. Default is 60 seconds.'),
  jwtRefreshTokenExpiresIn: z
    .number()
    .default(30 * 24 * 60 * 60)
    .describe('The expiration time of the JWT refresh token. Default is 30 days.'),
  jwtUserTokenExpiresIn: z
    .number()
    .default(24 * 60 * 60)
    .describe('The expiration time of the JWT user token. Default is 24 hours.'),

  // Cookie Configuration
  cookieSecure: z.boolean().default(false),
  cookieMaxAge: z
    .number()
    .default(24 * 60 * 60 * 1000)
    .describe('The expiration time of the cookie in milliseconds. Default is 24 hours.'),
  oauthSessionExpiresIn: z
    .number()
    .default(10 * 60 * 1000)
    .describe('The expiration time of the OAuth session in milliseconds. Default is 10 minutes.'),
  authCodeExpiresIn: z
    .number()
    .default(10 * 60 * 1000)
    .describe(
      'The expiration time of the authorization code in milliseconds. Default is 10 minutes.',
    ),

  // Protected Resource Metadata Configuration
  protectedResourceMetadata: z
    .object({
      scopesSupported: z.array(z.string()).default(['offline_access']),
      bearerMethodsSupported: z.array(z.string()).default(['header']),
      mcpVersionsSupported: z.array(z.string()).default(['2025-06-18']),
    })
    .default({}),

  // Authorization Server Metadata Configuration
  authorizationServerMetadata: z
    .object({
      responseTypesSupported: z.array(z.string()).default(['code']),
      responseModesSupported: z.array(z.string()).default(['query']),
      grantTypesSupported: z.array(z.string()).default(['authorization_code', 'refresh_token']),
      tokenEndpointAuthMethodsSupported: z
        .array(z.string())
        .default(['client_secret_basic', 'client_secret_post', 'none']),
      scopesSupported: z.array(z.string()).default(['offline_access']),
      codeChallengeMethodsSupported: z.array(z.string()).default(['plain', 'S256']),
    })
    .default({}),

  encryptionService: z
    .any()
    .describe('Encryption service instance implementing IEncryptionService'),
  oauthStore: z.any().describe('OAuth store instance implementing IOAuthStore'),
});

export type McpOAuthModuleOptionsInput = z.input<typeof mcpOAuthModuleOptionsSchema>;
export type McpOAuthModuleOptions = z.output<typeof mcpOAuthModuleOptionsSchema>;

// Export tokens for dependency injection
export const ENCRYPTION_SERVICE_TOKEN = Symbol('ENCRYPTION_SERVICE');
export const OAUTH_STORE_TOKEN = Symbol('OAUTH_STORE');

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: MCP_OAUTH_MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE: MCP_OAUTH_MODULE_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<McpOAuthModuleOptionsInput>()
  .setClassMethodName('forRoot')
  .setExtras({ isGlobal: true }, (definition, extras) => ({
    ...definition,
    global: extras.isGlobal,
  }))
  .build();

export const MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN = Symbol('MCP_OAUTH_MODULE_OPTIONS_RESOLVED');
