import { BadRequestException } from '@nestjs/common';
import { type Mocked, TestBed } from '@suites/unit';
import { beforeEach, describe, expect, it } from 'vitest';
import { type IntrospectionResponse, IntrospectRequestDto } from '../dtos/introspect-request.dto';
import { RevokeRequestDto } from '../dtos/revoke-request.dto';
import { TokenRequestDto } from '../dtos/token-request.dto';
import { McpOAuthService } from '../services/mcp-oauth.service';
import { TokenController } from './token.controller';

describe('TokenController', () => {
  let controller: TokenController;
  let authService: Mocked<McpOAuthService>;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(TokenController).compile();

    controller = unit;
    authService = unitRef.get(McpOAuthService);
  });

  describe('token', () => {
    describe('authorization_code grant', () => {
      const authCodeDto: TokenRequestDto = {
        grant_type: 'authorization_code',
        code: 'auth-code-123',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'test-client',
        code_verifier: 'verifier-123',
        resource: 'https://mcp.example.com',
        audience: 'https://mcp.example.com',
      };

      const mockTokenResponse = {
        access_token: 'access-token-123',
        token_type: 'Bearer' as const,
        expires_in: 3600,
        refresh_token: 'refresh-token-123',
        scope: 'offline_access',
      };

      it('exchanges authorization code for tokens', async () => {
        authService.exchangeAuthorizationCodeForToken.mockResolvedValue(mockTokenResponse);

        const result = await controller.token(authCodeDto);

        expect(authService.exchangeAuthorizationCodeForToken).toHaveBeenCalledWith(authCodeDto);
        expect(result).toEqual(mockTokenResponse);
      });

      it('handles PKCE validation in authorization code exchange', async () => {
        const pkceDto: TokenRequestDto = {
          ...authCodeDto,
          code_verifier: 'S256-verifier-string',
        };

        authService.exchangeAuthorizationCodeForToken.mockResolvedValue(mockTokenResponse);

        await controller.token(pkceDto);

        expect(authService.exchangeAuthorizationCodeForToken).toHaveBeenCalledWith(
          expect.objectContaining({
            code_verifier: 'S256-verifier-string',
          }),
        );
      });

      it('handles confidential client with client_secret', async () => {
        const confidentialDto: TokenRequestDto = {
          ...authCodeDto,
          client_secret: 'secret-123',
        };

        authService.exchangeAuthorizationCodeForToken.mockResolvedValue(mockTokenResponse);

        await controller.token(confidentialDto);

        expect(authService.exchangeAuthorizationCodeForToken).toHaveBeenCalledWith(
          expect.objectContaining({
            client_secret: 'secret-123',
          }),
        );
      });
    });

    describe('refresh_token grant', () => {
      const refreshDto: TokenRequestDto = {
        grant_type: 'refresh_token',
        refresh_token: 'refresh-token-123',
        client_id: 'test-client',
        scope: 'offline_access',
        resource: 'https://mcp.example.com',
        audience: 'https://mcp.example.com',
      };

      const mockRefreshResponse = {
        access_token: 'new-access-token-456',
        token_type: 'Bearer' as const,
        expires_in: 3600,
        refresh_token: 'new-refresh-token-456',
        scope: 'offline_access',
      };

      it('exchanges refresh token for new tokens', async () => {
        authService.exchangeRefreshTokenForToken.mockResolvedValue(mockRefreshResponse);

        const result = await controller.token(refreshDto);

        expect(authService.exchangeRefreshTokenForToken).toHaveBeenCalledWith(refreshDto);
        expect(result).toEqual(mockRefreshResponse);
      });

      it('handles scope reduction in refresh token request', async () => {
        const scopedRefreshDto: TokenRequestDto = {
          ...refreshDto,
          scope: 'mcp:read',
        };

        authService.exchangeRefreshTokenForToken.mockResolvedValue({
          ...mockRefreshResponse,
          scope: 'mcp:read',
        });

        const result = await controller.token(scopedRefreshDto);

        expect(result.scope).toBe('mcp:read');
      });
    });

    describe('unsupported grant types', () => {
      it('throws BadRequestException for unsupported grant type', async () => {
        const unsupportedDto = {
          grant_type: 'password',
          username: 'user',
          password: 'pass',
          // biome-ignore lint/suspicious/noExplicitAny: Testing invalid grant type
        } as any;

        await expect(controller.token(unsupportedDto)).rejects.toThrow(BadRequestException);
        await expect(controller.token(unsupportedDto)).rejects.toThrow(
          'Unsupported grant type password',
        );
      });

      it('throws BadRequestException for implicit grant', async () => {
        const implicitDto = {
          grant_type: 'implicit',
          // biome-ignore lint/suspicious/noExplicitAny: Testing invalid grant type
        } as any;

        await expect(controller.token(implicitDto)).rejects.toThrow(
          'Unsupported grant type implicit',
        );
      });
    });

    describe('error handling', () => {
      it('propagates service errors for authorization code exchange', async () => {
        const authCodeDto: TokenRequestDto = {
          grant_type: 'authorization_code',
          code: 'invalid-code',
          redirect_uri: 'http://localhost:3000/callback',
          client_id: 'test-client',
          resource: 'https://mcp.example.com',
          audience: 'https://mcp.example.com',
        };

        authService.exchangeAuthorizationCodeForToken.mockRejectedValue(
          new BadRequestException('Invalid authorization code'),
        );

        await expect(controller.token(authCodeDto)).rejects.toThrow('Invalid authorization code');
      });

      it('propagates service errors for refresh token exchange', async () => {
        const refreshDto: TokenRequestDto = {
          grant_type: 'refresh_token',
          refresh_token: 'expired-token',
          client_id: 'test-client',
          resource: 'https://mcp.example.com',
          audience: 'https://mcp.example.com',
        };

        authService.exchangeRefreshTokenForToken.mockRejectedValue(
          new BadRequestException('Refresh token expired'),
        );

        await expect(controller.token(refreshDto)).rejects.toThrow('Refresh token expired');
      });
    });
  });

  describe('introspect', () => {
    const introspectDto: IntrospectRequestDto = {
      token: 'token-to-introspect',
      client_id: 'test-client',
      client_secret: 'secret-123',
      token_type_hint: 'access_token',
    };

    describe('active tokens', () => {
      const activeTokenResponse: IntrospectionResponse = {
        active: true,
        scope: 'offline_access mcp:read',
        client_id: 'test-client',
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'user-123',
        aud: 'https://mcp.example.com',
        iss: 'https://auth.example.com',
        jti: 'token-jti-123',
      };

      it('returns metadata for active access token', async () => {
        authService.introspectToken.mockResolvedValue(activeTokenResponse);

        const result = await controller.introspect(introspectDto);

        expect(authService.introspectToken).toHaveBeenCalledWith(introspectDto);
        expect(result).toEqual(activeTokenResponse);
        expect(result.active).toBe(true);
      });

      it('handles refresh token introspection', async () => {
        const refreshIntrospectDto: IntrospectRequestDto = {
          ...introspectDto,
          token_type_hint: 'refresh_token',
        };

        authService.introspectToken.mockResolvedValue({
          ...activeTokenResponse,
          token_type: 'refresh_token',
        });

        const result = await controller.introspect(refreshIntrospectDto);

        expect(result.token_type).toBe('refresh_token');
      });
    });

    describe('inactive tokens', () => {
      it('returns inactive for expired token', async () => {
        authService.introspectToken.mockResolvedValue({ active: false });

        const result = await controller.introspect(introspectDto);

        expect(result).toEqual({ active: false });
      });

      it('returns inactive for invalid token', async () => {
        const invalidDto: IntrospectRequestDto = {
          ...introspectDto,
          token: 'invalid-token',
        };

        authService.introspectToken.mockResolvedValue({ active: false });

        const result = await controller.introspect(invalidDto);

        expect(result).toEqual({ active: false });
      });
    });

    describe('error handling per RFC 7662', () => {
      it('returns inactive for authentication errors', async () => {
        authService.introspectToken.mockRejectedValue(new Error('Invalid client credentials'));

        const result = await controller.introspect(introspectDto);

        expect(result).toEqual({ active: false });
      });

      it('returns inactive for any service errors', async () => {
        authService.introspectToken.mockRejectedValue(new Error('Database connection failed'));

        const result = await controller.introspect(introspectDto);

        expect(result).toEqual({ active: false });
      });

      it('does not leak error information', async () => {
        const sensitiveError = new Error('Token belongs to different client');
        authService.introspectToken.mockRejectedValue(sensitiveError);

        const result = await controller.introspect(introspectDto);

        expect(result).toEqual({ active: false });
        expect(result).not.toHaveProperty('error');
        expect(result).not.toHaveProperty('error_description');
      });
    });
  });

  describe('revoke', () => {
    const revokeDto: RevokeRequestDto = {
      token: 'token-to-revoke',
      client_id: 'test-client',
      client_secret: 'secret-123',
      token_type_hint: 'access_token',
    };

    describe('successful revocation', () => {
      it('revokes access token successfully', async () => {
        authService.revokeToken.mockResolvedValue(undefined);

        const result = await controller.revoke(revokeDto);

        expect(authService.revokeToken).toHaveBeenCalledWith(revokeDto);
        expect(result).toBeUndefined();
      });

      it('revokes refresh token successfully', async () => {
        const refreshRevokeDto: RevokeRequestDto = {
          ...revokeDto,
          token_type_hint: 'refresh_token',
        };

        authService.revokeToken.mockResolvedValue(undefined);

        const result = await controller.revoke(refreshRevokeDto);

        expect(authService.revokeToken).toHaveBeenCalledWith(refreshRevokeDto);
        expect(result).toBeUndefined();
      });

      it('handles revocation without token_type_hint', async () => {
        const noHintDto: RevokeRequestDto = {
          token: 'token-to-revoke',
          client_id: 'test-client',
          client_secret: 'secret-123',
        };

        authService.revokeToken.mockResolvedValue(undefined);

        const result = await controller.revoke(noHintDto);

        expect(authService.revokeToken).toHaveBeenCalledWith(noHintDto);
        expect(result).toBeUndefined();
      });
    });

    describe('error handling per RFC 7009', () => {
      it('returns 200 OK even for invalid token', async () => {
        authService.revokeToken.mockRejectedValue(new Error('Token not found'));

        const result = await controller.revoke(revokeDto);

        expect(result).toBeUndefined();
      });

      it('returns 200 OK for authentication errors', async () => {
        authService.revokeToken.mockRejectedValue(new Error('Invalid client credentials'));

        const result = await controller.revoke(revokeDto);

        expect(result).toBeUndefined();
      });

      it('returns 200 OK for service errors', async () => {
        authService.revokeToken.mockRejectedValue(new Error('Database connection failed'));

        const result = await controller.revoke(revokeDto);

        expect(result).toBeUndefined();
      });

      it('does not leak error information', async () => {
        const sensitiveError = new Error('Token belongs to different client');
        authService.revokeToken.mockRejectedValue(sensitiveError);

        const result = await controller.revoke(revokeDto);

        expect(result).toBeUndefined();
      });
    });
  });
});
