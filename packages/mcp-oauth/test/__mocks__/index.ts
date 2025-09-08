import { MockEncryptionService } from './encryption.mock';
import { MockMetricService } from './metric.mock';
import { createMockOAuthProvider } from './oauth-provider.mock';
import { MockOAuthStore } from './oauth-store.mock';

export { MockEncryptionService } from './encryption.mock';
export { MockMetricService } from './metric.mock';
export { MockPassportStrategy } from './mock-passport-strategy';
export { createFailingOAuthProvider, createMockOAuthProvider } from './oauth-provider.mock';
export { MockOAuthStore } from './oauth-store.mock';
export * from './test-helpers';

// Helper function to create a complete mock module configuration
export const createMockModuleConfig = () => ({
  provider: createMockOAuthProvider(),

  clientId: 'test-server-client',
  clientSecret: 'test-server-secret',
  hmacSecret: 'test-hmac-secret',

  serverUrl: 'http://localhost:3000',
  resource: 'http://localhost:3000/mcp',

  authCodeExpiresIn: 600,
  accessTokenExpiresIn: 3600,
  refreshTokenExpiresIn: 86400,
  oauthSessionExpiresIn: 600000,

  oauthStore: new MockOAuthStore(),
  encryptionService: new MockEncryptionService(),
  metricService: new MockMetricService(),

  protectedResourceMetadata: {
    scopesSupported: ['offline_access', 'mcp:read', 'mcp:write'],
    bearerMethodsSupported: ['header'],
    mcpVersionsSupported: ['2025-06-18'],
  },

  authorizationServerMetadata: {
    responseTypesSupported: ['code'],
    responseModesSupported: ['query'],
    grantTypesSupported: ['authorization_code', 'refresh_token'],
    tokenEndpointAuthMethodsSupported: ['client_secret_basic', 'client_secret_post', 'none'],
    scopesSupported: ['offline_access', 'mcp:read', 'mcp:write'],
    codeChallengeMethodsSupported: ['plain', 'S256'],
  },
});
