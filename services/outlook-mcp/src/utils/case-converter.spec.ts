/** biome-ignore-all lint/suspicious/noExplicitAny: Test mock */
import { describe, expect, it } from 'vitest';
import {
  convertAuthCodeToPrisma,
  convertOAuthClientToPrisma,
  convertPrismaToAuthCode,
  convertPrismaToOAuthClient,
  convertPrismaToSession,
  convertSessionToPrisma,
} from './case-converter';

describe('case-converter', () => {
  describe('OAuth Client conversion', () => {
    const mockOAuthClient = {
      client_id: 'test-client-id',
      client_secret: 'test-secret',
      client_name: 'Test Client',
      client_description: 'Test Description',
      logo_uri: 'https://example.com/logo.png',
      client_uri: 'https://example.com',
      developer_name: 'Test Developer',
      developer_email: 'test@example.com',
      redirect_uris: ['https://example.com/callback'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
      created_at: new Date('2023-01-01'),
      updated_at: new Date('2023-01-02'),
    };

    const mockPrismaClient = {
      clientId: 'test-client-id',
      clientSecret: 'test-secret',
      clientName: 'Test Client',
      clientDescription: 'Test Description',
      logoUri: 'https://example.com/logo.png',
      clientUri: 'https://example.com',
      developerName: 'Test Developer',
      developerEmail: 'test@example.com',
      redirectUris: ['https://example.com/callback'],
      grantTypes: ['authorization_code'],
      responseTypes: ['code'],
      tokenEndpointAuthMethod: 'client_secret_post',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('converts OAuthClient to Prisma format', () => {
      const result = convertOAuthClientToPrisma(mockOAuthClient);

      expect(result).toEqual(mockPrismaClient);
    });

    it('converts Prisma client to OAuthClient format', () => {
      const result = convertPrismaToOAuthClient(mockPrismaClient as any);

      expect(result).toEqual(mockOAuthClient);
    });

    it('handles null values in Prisma to OAuth conversion', () => {
      const prismaClientWithNulls = {
        ...mockPrismaClient,
        clientSecret: null,
        clientDescription: null,
        logoUri: null,
        clientUri: null,
        developerName: null,
        developerEmail: null,
      };

      const result = convertPrismaToOAuthClient(prismaClientWithNulls as any);

      expect(result).toEqual({
        ...mockOAuthClient,
        client_secret: undefined,
        client_description: undefined,
        logo_uri: undefined,
        client_uri: undefined,
        developer_name: undefined,
        developer_email: undefined,
      });
    });
  });

  describe('Authorization Code conversion', () => {
    const mockAuthCode = {
      code: 'test-auth-code',
      user_id: 'user-123',
      client_id: 'client-123',
      redirect_uri: 'https://example.com/callback',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
      resource: 'https://example.com/resource',
      scope: 'read write',
      expires_at: 1672531200000, // 2023-01-01 00:00:00 UTC
      user_profile_id: 'profile-123',
    };

    const mockPrismaAuthCode = {
      code: 'test-auth-code',
      userId: 'user-123',
      clientId: 'client-123',
      redirectUri: 'https://example.com/callback',
      codeChallenge: 'challenge',
      codeChallengeMethod: 'S256',
      resource: 'https://example.com/resource',
      scope: 'read write',
      expiresAt: new Date(1672531200000),
      userProfileId: 'profile-123',
    };

    it('converts AuthorizationCode to Prisma format', () => {
      const result = convertAuthCodeToPrisma(mockAuthCode);

      expect(result).toEqual(mockPrismaAuthCode);
    });

    it('converts Prisma auth code to AuthorizationCode format', () => {
      const result = convertPrismaToAuthCode(mockPrismaAuthCode as any);

      expect(result).toEqual(mockAuthCode);
    });

    it('handles null resource and scope in Prisma to AuthCode conversion', () => {
      const prismaAuthCodeWithNulls = {
        ...mockPrismaAuthCode,
        resource: null,
        scope: null,
      };

      const result = convertPrismaToAuthCode(prismaAuthCodeWithNulls as any);

      expect(result).toEqual({
        ...mockAuthCode,
        resource: undefined,
        scope: undefined,
      });
    });
  });

  describe('OAuth Session conversion', () => {
    const mockOAuthSession = {
      sessionId: 'session-123',
      state: 'state-value',
      clientId: 'client-123',
      redirectUri: 'https://example.com/callback',
      codeChallenge: 'challenge',
      codeChallengeMethod: 'S256',
      oauthState: 'oauth-state',
      scope: 'read write',
      resource: 'https://example.com/resource',
      expiresAt: 1672531200000,
    };

    const mockPrismaSession = {
      sessionId: 'session-123',
      state: 'state-value',
      clientId: 'client-123',
      redirectUri: 'https://example.com/callback',
      codeChallenge: 'challenge',
      codeChallengeMethod: 'S256',
      oauthState: 'oauth-state',
      scope: 'read write',
      resource: 'https://example.com/resource',
      expiresAt: new Date(1672531200000),
    };

    it('converts OAuthSession to Prisma format', () => {
      const result = convertSessionToPrisma(mockOAuthSession);

      expect(result).toEqual(mockPrismaSession);
    });

    it('converts Prisma session to OAuthSession format', () => {
      const result = convertPrismaToSession(mockPrismaSession as any);

      expect(result).toEqual(mockOAuthSession);
    });

    it('handles null values in Prisma to Session conversion', () => {
      const prismaSessionWithNulls = {
        ...mockPrismaSession,
        clientId: null,
        redirectUri: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        oauthState: null,
        scope: null,
        resource: null,
      };

      const result = convertPrismaToSession(prismaSessionWithNulls as any);

      expect(result).toEqual({
        ...mockOAuthSession,
        clientId: undefined,
        redirectUri: undefined,
        codeChallenge: undefined,
        codeChallengeMethod: undefined,
        oauthState: undefined,
        scope: undefined,
        resource: undefined,
      });
    });
  });
});
