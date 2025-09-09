/** biome-ignore-all lint/suspicious/noExplicitAny: Test mock */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockEncryptionService, MockPrismaService } from '../../test/__mocks__';
import { TokenProvider } from './token.provider';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('TokenProvider', () => {
  const mockConfig = {
    userProfileId: 'user-profile-123',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['https://graph.microsoft.com/.default'],
  };

  const mockDependencies = {
    prisma: new MockPrismaService(),
    encryptionService: new MockEncryptionService(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('getAccessToken', () => {
    it('returns decrypted access token for valid user', async () => {
      const mockUserProfile = {
        id: 'user-profile-123',
        accessToken: 'ZW5jcnlwdGVkLWFjY2Vzcy10b2tlbg==', // base64 encoded "encrypted-access-token"
      };

      mockDependencies.prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const unit = new TokenProvider(mockConfig, mockDependencies as any);

      const result = await unit.getAccessToken();

      expect(result).toBe('encrypted-access-token');
      expect(mockDependencies.prisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-profile-123' },
      });
    });

    it('throws error when user profile not found', async () => {
      mockDependencies.prisma.userProfile.findUnique.mockResolvedValue(null);

      const unit = new TokenProvider(mockConfig, mockDependencies as any);

      await expect(unit.getAccessToken()).rejects.toThrow(
        'User profile not found: user-profile-123',
      );
    });

    it('throws error when access token not found', async () => {
      const mockUserProfile = {
        id: 'user-profile-123',
        accessToken: null,
      };

      mockDependencies.prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const unit = new TokenProvider(mockConfig, mockDependencies as any);

      await expect(unit.getAccessToken()).rejects.toThrow(
        'Access token not found for user: user-profile-123',
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('successfully refreshes access token', async () => {
      const mockUserProfile = {
        id: 'user-profile-123',
        refreshToken: 'ZW5jcnlwdGVkLXJlZnJlc2gtdG9rZW4=', // base64 encoded "encrypted-refresh-token"
      };

      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };

      mockDependencies.prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);
      mockDependencies.prisma.userProfile.update.mockResolvedValue({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockTokenResponse),
      });

      const unit = new TokenProvider(mockConfig, mockDependencies as any);

      const result = await unit.refreshAccessToken('user-profile-123');

      expect(result).toBe('new-access-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: 'encrypted-refresh-token',
            client_id: 'test-client-id',
            client_secret: 'test-client-secret',
            scope: 'https://graph.microsoft.com/.default',
          }),
        },
      );

      expect(mockDependencies.prisma.userProfile.update).toHaveBeenCalledWith({
        where: { id: 'user-profile-123' },
        data: {
          accessToken: 'bmV3LWFjY2Vzcy10b2tlbg==', // base64 encoded "new-access-token"
          refreshToken: 'bmV3LXJlZnJlc2gtdG9rZW4=', // base64 encoded "new-refresh-token"
        },
      });
    });

    it('uses existing refresh token when new one not provided', async () => {
      const mockUserProfile = {
        id: 'user-profile-123',
        refreshToken: 'ZW5jcnlwdGVkLXJlZnJlc2gtdG9rZW4=',
      };

      const mockTokenResponse = {
        access_token: 'new-access-token',
        // No refresh_token in response
      };

      mockDependencies.prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);
      mockDependencies.prisma.userProfile.update.mockResolvedValue({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockTokenResponse),
      });

      const unit = new TokenProvider(mockConfig, mockDependencies as any);

      await unit.refreshAccessToken('user-profile-123');

      expect(mockDependencies.prisma.userProfile.update).toHaveBeenCalledWith({
        where: { id: 'user-profile-123' },
        data: {
          accessToken: 'bmV3LWFjY2Vzcy10b2tlbg==',
          refreshToken: expect.any(String), // Original refresh token encrypted again
        },
      });
    });

    it('throws error when user profile not found', async () => {
      mockDependencies.prisma.userProfile.findUnique.mockResolvedValue(null);

      const unit = new TokenProvider(mockConfig, mockDependencies as any);

      await expect(unit.refreshAccessToken('user-profile-123')).rejects.toThrow(
        'No refresh token available for user: user-profile-123',
      );
    });

    it('throws error when refresh token not found', async () => {
      const mockUserProfile = {
        id: 'user-profile-123',
        refreshToken: null,
      };

      mockDependencies.prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const unit = new TokenProvider(mockConfig, mockDependencies as any);

      await expect(unit.refreshAccessToken('user-profile-123')).rejects.toThrow(
        'No refresh token available for user: user-profile-123',
      );
    });

    it('throws error when token refresh fails', async () => {
      const mockUserProfile = {
        id: 'user-profile-123',
        refreshToken: 'ZW5jcnlwdGVkLXJlZnJlc2gtdG9rZW4=',
      };

      mockDependencies.prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('Invalid refresh token'),
      });

      const unit = new TokenProvider(mockConfig, mockDependencies as any);

      await expect(unit.refreshAccessToken('user-profile-123')).rejects.toThrow(
        'Token refresh failed: Bad Request',
      );
    });

    it('handles fetch errors gracefully', async () => {
      const mockUserProfile = {
        id: 'user-profile-123',
        refreshToken: 'ZW5jcnlwdGVkLXJlZnJlc2gtdG9rZW4=',
      };

      mockDependencies.prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const unit = new TokenProvider(mockConfig, mockDependencies as any);

      await expect(unit.refreshAccessToken('user-profile-123')).rejects.toThrow(
        'Token refresh failed: Network error',
      );
    });
  });
});
