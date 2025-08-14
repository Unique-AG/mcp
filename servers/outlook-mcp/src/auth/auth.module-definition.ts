import { ZodConfigurableModuleBuilder } from '@proventuslabs/nestjs-zod';
import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(),
  raw: z.any().optional(),
});

export const authModuleOptionsSchema = z.object({
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
      .returns(z.any()),
    scope: z.array(z.string()).optional(),
    profileMapper: z.function().args(z.any()).returns(userProfileSchema),
  }),

  // Required OAuth Provider Credentials
  clientId: z.string().describe('The client ID of the OAuth provider.'),
  clientSecret: z.string().describe('The client secret of the OAuth provider.'),

  // Required JWT Configuration
  jwtSecret: z.string().describe('The secret key for the MCP Server to sign JWT tokens.'),

  // Server Configuration
  serverUrl: z.string().url().default('http://localhost:3000'),
  resource: z
    .string()
    .url()
    .default('http://localhost:3000/mcp')
    .describe("should be the endpoint clients connect to, e.g.: 'http://localhost:3000/mcp'"),

  // JWT Configuration
  jwtIssuer: z.string().url().default('http://localhost:3000'),
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
});

export type AuthModuleOptions = z.infer<typeof authModuleOptionsSchema>;

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN: AUTH_MODULE_OPTIONS_TOKEN } =
  new ZodConfigurableModuleBuilder(authModuleOptionsSchema, {
    moduleName: 'AuthModule',
  })
    .setClassMethodName('forRoot')
    .setExtras({ isGlobal: true }, (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }))
    .build();
