import type { OAuthProviderConfig } from '../../src/interfaces/oauth-provider.interface';
import { MockPassportStrategy } from './mock-passport-strategy';

export const createMockOAuthProvider = (overrides: Partial<OAuthProviderConfig> = {}): OAuthProviderConfig => ({
  name: 'test-provider',
  strategy: MockPassportStrategy,
  strategyOptions: (config) => ({
    name: 'oauth-provider',
    user: {
      id: 'user-123',
      username: 'testuser',
      displayName: 'Test User',
      emails: [{ value: 'test@example.com' }],
    },
    ...overrides.strategyOptions?.(config),
  }),
  profileMapper: (profile) => ({
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    email: profile.emails?.[0]?.value,
    avatarUrl: profile.photos?.[0]?.value,
    raw: profile,
  }),
  ...overrides,
});

export const createFailingOAuthProvider = (): OAuthProviderConfig => ({
  name: 'failing-provider',
  strategy: MockPassportStrategy,
  strategyOptions: (_config) => ({
    name: 'oauth-provider',
    failureMessage: 'User denied access',
  }),
  profileMapper: (_profile) => {
    throw new Error('Profile mapping failed');
  },
});
