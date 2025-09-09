/** biome-ignore-all lint/suspicious/noExplicitAny: Test mock */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockCacheManager, MockEncryptionService, MockPrismaService } from '../__mocks__';
import { McpOAuthStore } from './mcp-oauth.store';

describe('McpOAuthStore', () => {
  let mockPrisma: MockPrismaService;
  let mockEncryption: MockEncryptionService;
  let mockCache: MockCacheManager;

  beforeEach(() => {
    mockPrisma = new MockPrismaService();
    mockEncryption = new MockEncryptionService();
    mockCache = new MockCacheManager();
    vi.clearAllMocks();
  });

  describe('OAuth Client management', () => {
    const mockClient = {
      client_id: 'test-client-id',
      client_name: 'Test Client',
      client_secret: 'test-secret',
      redirect_uris: ['https://example.com/callback'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
      created_at: new Date('2023-01-01'),
      updated_at: new Date('2023-01-02'),
    };

    it('stores OAuth client', async () => {
      const savedClient = {
        clientId: 'test-client-id',
        clientName: 'Test Client',
        clientSecret: 'test-secret',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'],
        responseTypes: ['code'],
        tokenEndpointAuthMethod: 'client_secret_post',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      mockPrisma.oAuthClient.create.mockResolvedValue(savedClient);

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.storeClient(mockClient);

      expect(mockPrisma.oAuthClient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'test-client-id',
          clientName: 'Test Client',
        }),
      });
      expect(result).toEqual(mockClient);
    });

    it('gets OAuth client by ID', async () => {
      const prismaClient = {
        clientId: 'test-client-id',
        clientName: 'Test Client',
        clientSecret: 'test-secret',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'],
        responseTypes: ['code'],
        tokenEndpointAuthMethod: 'client_secret_post',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      mockPrisma.oAuthClient.findUnique.mockResolvedValue(prismaClient);

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.getClient('test-client-id');

      expect(mockPrisma.oAuthClient.findUnique).toHaveBeenCalledWith({
        where: { clientId: 'test-client-id' },
      });
      expect(result).toEqual(mockClient);
    });

    it('returns undefined when client not found', async () => {
      mockPrisma.oAuthClient.findUnique.mockResolvedValue(null);

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.getClient('non-existent');

      expect(result).toBeUndefined();
    });

    it('finds client by name', async () => {
      const prismaClient = {
        clientId: 'test-client-id',
        clientName: 'Test Client',
        clientSecret: null,
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'],
        responseTypes: ['code'],
        tokenEndpointAuthMethod: 'client_secret_post',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      mockPrisma.oAuthClient.findFirst.mockResolvedValue(prismaClient);

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.findClient('Test Client');

      expect(mockPrisma.oAuthClient.findFirst).toHaveBeenCalledWith({
        where: { clientName: 'Test Client' },
      });
      expect(result?.client_secret).toBeUndefined();
    });

    it('generates client ID with normalized name', async () => {
      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = unit.generateClientId({
        client_name: 'Test Client App!',
      } as any);

      expect(result).toMatch(/^testclientapp_[a-z0-9]+$/);
    });
  });

  describe('Authorization Code management', () => {
    const mockAuthCode = {
      code: 'test-auth-code',
      user_id: 'user-123',
      client_id: 'client-123',
      redirect_uri: 'https://example.com/callback',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
      expires_at: Date.now() + 600000, // 10 minutes from now
      user_profile_id: 'profile-123',
    };

    it('stores authorization code', async () => {
      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      await unit.storeAuthCode(mockAuthCode);

      expect(mockPrisma.authorizationCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'test-auth-code',
          userId: 'user-123',
          clientId: 'client-123',
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('gets valid authorization code', async () => {
      const prismaAuthCode = {
        code: 'test-auth-code',
        userId: 'user-123',
        clientId: 'client-123',
        redirectUri: 'https://example.com/callback',
        codeChallenge: 'challenge',
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() + 600000),
        userProfileId: 'profile-123',
        resource: null,
        scope: null,
      };

      mockPrisma.authorizationCode.findUnique.mockResolvedValue(prismaAuthCode);

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.getAuthCode('test-auth-code');

      expect(result).toEqual(
        expect.objectContaining({
          code: 'test-auth-code',
          user_id: 'user-123',
          expires_at: expect.any(Number),
        }),
      );
    });

    it('removes expired authorization code and returns undefined', async () => {
      const expiredAuthCode = {
        code: 'expired-code',
        userId: 'user-123',
        clientId: 'client-123',
        redirectUri: 'https://example.com/callback',
        codeChallenge: 'challenge',
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() - 1000), // Expired
        userProfileId: 'profile-123',
        resource: null,
        scope: null,
      };

      mockPrisma.authorizationCode.findUnique.mockResolvedValue(expiredAuthCode);

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.getAuthCode('expired-code');

      expect(result).toBeUndefined();
      expect(mockPrisma.authorizationCode.delete).toHaveBeenCalledWith({
        where: { code: 'expired-code' },
      });
    });

    it('removes authorization code', async () => {
      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      await unit.removeAuthCode('test-code');

      expect(mockPrisma.authorizationCode.delete).toHaveBeenCalledWith({
        where: { code: 'test-code' },
      });
    });
  });

  describe('User Profile management', () => {
    const mockUser = {
      profile: {
        id: 'ms-user-123',
        displayName: 'Test User',
        mail: 'test@example.com',
        userPrincipalName: 'test@example.com',
        username: 'test@example.com',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      provider: 'microsoft',
    };

    it('creates new user profile', async () => {
      mockPrisma.userProfile.upsert.mockResolvedValue({
        id: 'profile-123',
        provider: 'microsoft',
        providerUserId: 'ms-user-123',
        username: 'test@example.com',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        raw: mockUser.profile,
        accessToken: 'encrypted-access-token',
        refreshToken: 'encrypted-refresh-token',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.upsertUserProfile(mockUser);

      expect(result).toBe('profile-123');
      expect(mockPrisma.userProfile.upsert).toHaveBeenCalledWith({
        where: {
          provider_providerUserId: {
            provider: 'microsoft',
            providerUserId: 'ms-user-123',
          },
        },
        create: expect.objectContaining({
          provider: 'microsoft',
          providerUserId: 'ms-user-123',
          displayName: 'Test User',
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        }),
        update: expect.objectContaining({
          displayName: 'Test User',
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        }),
      });
    });

    it('gets user profile by ID', async () => {
      const mockProfile = {
        id: 'profile-123',
        provider: 'microsoft',
        providerUserId: 'ms-user-123',
        username: 'test@example.com',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        raw: { id: 'ms-user-123' },
        accessToken: 'encrypted-access-token',
        refreshToken: 'encrypted-refresh-token',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.getUserProfileById('profile-123');

      expect(result).toEqual({
        profile_id: 'profile-123',
        provider: 'microsoft',
        id: 'ms-user-123',
        username: 'test@example.com',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: undefined, // null becomes undefined
        raw: { id: 'ms-user-123' },
      });
    });
  });

  describe('Token management with caching', () => {
    const mockAccessTokenMetadata = {
      userId: 'user-123',
      clientId: 'client-123',
      scope: 'read',
      resource: 'test-resource',
      expiresAt: new Date(Date.now() + 3600000),
      userProfileId: 'profile-123',
    };

    it('stores access token with caching', async () => {
      // Mock getUserProfileById to return a profile
      mockPrisma.userProfile.findUnique.mockResolvedValue({
        id: 'profile-123',
        provider: 'microsoft',
        providerUserId: 'user-123',
      });

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      await unit.storeAccessToken('test-token', mockAccessTokenMetadata);

      expect(mockPrisma.token.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: 'test-token',
          type: 'ACCESS',
          userId: 'user-123',
          clientId: 'client-123',
        }),
      });

      expect(mockCache.set).toHaveBeenCalledWith(
        'access_token:test-token',
        mockAccessTokenMetadata,
        expect.any(Number), // TTL in milliseconds
      );
    });

    it('gets access token from cache first', async () => {
      mockCache.get.mockResolvedValue(mockAccessTokenMetadata);

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.getAccessToken('test-token');

      expect(result).toEqual(mockAccessTokenMetadata);
      expect(mockCache.get).toHaveBeenCalledWith('access_token:test-token');
      expect(mockPrisma.token.findUnique).not.toHaveBeenCalled();
    });

    it('falls back to database when cache miss', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.token.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'test-token',
        type: 'ACCESS',
        expiresAt: new Date(Date.now() + 3600000),
        userId: 'user-123',
        clientId: 'client-123',
        scope: 'read',
        resource: 'test-resource',
        userProfileId: 'profile-123',
        familyId: null,
        generation: null,
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.getAccessToken('test-token');

      expect(result).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          clientId: 'client-123',
          scope: 'read',
          resource: 'test-resource',
          userProfileId: 'profile-123',
          expiresAt: expect.any(Date),
        }),
      );
      expect(mockPrisma.token.findUnique).toHaveBeenCalledWith({
        where: { token: 'test-token' },
        include: {
          userProfile: true,
        },
      });
      expect(mockCache.set).toHaveBeenCalled(); // Cache the result
    });

    it('removes access token and clears cache', async () => {
      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      await unit.removeAccessToken('test-token');

      expect(mockPrisma.token.delete).toHaveBeenCalledWith({
        where: { token: 'test-token' },
      });
      expect(mockCache.del).toHaveBeenCalledWith('access_token:test-token');
    });
  });

  describe('Refresh Token Family management', () => {
    it('revokes token family', async () => {
      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      await unit.revokeTokenFamily('family-123');

      expect(mockPrisma.token.deleteMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-123',
        },
      });
    });

    it('marks refresh token as used', async () => {
      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      await unit.markRefreshTokenAsUsed('refresh-token');

      expect(mockPrisma.token.update).toHaveBeenCalledWith({
        where: { token: 'refresh-token' },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('checks if refresh token is used', async () => {
      mockPrisma.token.findUnique.mockResolvedValue({
        usedAt: new Date(),
      });

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.isRefreshTokenUsed('refresh-token');

      expect(result).toBe(true);
      expect(mockPrisma.token.findUnique).toHaveBeenCalledWith({
        where: { token: 'refresh-token' },
      });
    });
  });

  describe('Token cleanup', () => {
    it('cleans up expired tokens', async () => {
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 5 });

      const unit = new McpOAuthStore(mockPrisma as any, mockEncryption, mockCache as any);

      const result = await unit.cleanupExpiredTokens(30);

      expect(result).toBe(5);
      expect(mockPrisma.token.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});
