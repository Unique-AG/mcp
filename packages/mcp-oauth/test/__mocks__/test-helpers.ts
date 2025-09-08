import type {
  AccessTokenMetadata,
  RefreshTokenMetadata,
} from '../../src/interfaces/io-auth-store.interface';
import type { AuthorizationCode, OAuthClient } from '../../src/interfaces/oauth-client.interface';

/**
 * Helper functions for creating test data with proper types
 */

export const createTestClient = (overrides: Partial<OAuthClient> = {}): OAuthClient => ({
  client_id: 'test-client-123',
  client_name: 'Test OAuth Client',
  redirect_uris: ['http://localhost:3000/callback'],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  token_endpoint_auth_method: 'none',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createTestAuthCode = (
  overrides: Partial<AuthorizationCode> = {},
): AuthorizationCode => ({
  code: 'test-auth-code-123',
  user_id: 'user-123',
  client_id: 'test-client-123',
  redirect_uri: 'http://localhost:3000/callback',
  code_challenge: '',
  code_challenge_method: 'plain',
  scope: 'offline_access',
  expires_at: Date.now() + 600000, // 10 minutes
  user_profile_id: 'profile-123',
  ...overrides,
});

export const createTestAccessToken = (
  overrides: Partial<AccessTokenMetadata> = {},
): AccessTokenMetadata => ({
  userId: 'user-123',
  clientId: 'test-client-123',
  scope: 'offline_access',
  resource: 'http://localhost:3000/mcp',
  expiresAt: new Date(Date.now() + 3600000), // 1 hour
  userProfileId: 'profile-123',
  ...overrides,
});

export const createTestRefreshToken = (
  overrides: Partial<RefreshTokenMetadata> = {},
): RefreshTokenMetadata => ({
  userId: 'user-123',
  clientId: 'test-client-123',
  scope: 'offline_access',
  resource: 'http://localhost:3000/mcp',
  expiresAt: new Date(Date.now() + 86400000), // 24 hours
  userProfileId: 'profile-123',
  familyId: 'family-123',
  generation: 1,
  ...overrides,
});

export const createTestUserProfile = () => ({
  id: 'user-123',
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  avatarUrl: 'https://example.com/avatar.jpg',
});

/**
 * Common test scenarios
 */
export const TEST_SCENARIOS = {
  PKCE: {
    codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    codeChallengeMethod: 'S256',
  },
  CLIENT_CREDENTIALS: {
    public: {
      client_id: 'public-client',
      token_endpoint_auth_method: 'none',
    },
    confidential: {
      client_id: 'confidential-client',
      client_secret: 'secret-123',
      token_endpoint_auth_method: 'client_secret_basic',
    },
  },
  REDIRECT_URIS: {
    valid: [
      'http://localhost:3000/callback',
      'http://localhost:4000/callback',
      'https://example.com/oauth/callback',
    ],
    invalid: [
      'http://evil.com/callback',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
    ],
  },
} as const;
