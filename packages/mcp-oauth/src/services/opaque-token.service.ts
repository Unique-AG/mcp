import { randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IOAuthStore, RefreshTokenMetadata } from '../interfaces/io-auth-store.interface';
import {
  MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN,
  type McpOAuthModuleOptions,
  OAUTH_STORE_TOKEN,
} from '../mcp-oauth.module-definition';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  scope?: string;
}

export interface TokenValidationResult {
  userId: string;
  clientId: string;
  scope: string;
  resource: string;
  userProfileId: string;
  userData?: unknown;
}

@Injectable()
export class OpaqueTokenService {
  private readonly logger = new Logger(this.constructor.name);

  private readonly ACCESS_TOKEN_BYTES = 64;
  private readonly REFRESH_TOKEN_BYTES = 64;

  public constructor(
    @Inject(MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN) private readonly options: McpOAuthModuleOptions,
    @Inject(OAUTH_STORE_TOKEN) private readonly store: IOAuthStore,
  ) {}

  private generateSecureToken(bytes: number): string {
    return randomBytes(bytes).toString('base64url');
  }

  public async generateTokenPair(
    userId: string,
    clientId: string,
    scope = '',
    resource: string,
    userProfileId: string,
  ): Promise<TokenPair> {
    const accessToken = this.generateSecureToken(this.ACCESS_TOKEN_BYTES);
    const refreshToken = this.generateSecureToken(this.REFRESH_TOKEN_BYTES);

    const now = Date.now();
    const accessExpiresAt = new Date(now + this.options.jwtAccessTokenExpiresIn * 1000);
    const refreshExpiresAt = new Date(now + this.options.jwtRefreshTokenExpiresIn * 1000);

    await this.store.storeAccessToken(accessToken, {
      userId,
      clientId,
      scope,
      resource,
      expiresAt: accessExpiresAt,
      userProfileId,
    });

    await this.store.storeRefreshToken(refreshToken, {
      userId,
      clientId,
      scope,
      resource,
      expiresAt: refreshExpiresAt,
      userProfileId,
    });

    this.logger.debug({
      msg: 'Generated opaque token pair',
      userId,
      clientId,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: this.options.jwtAccessTokenExpiresIn,
      scope,
    };
  }

  public async validateAccessToken(token: string): Promise<TokenValidationResult | null> {
    const metadata = await this.store.getAccessToken(token);

    if (!metadata) {
      this.logger.debug({ msg: 'Access token not found', tokenPrefix: token.substring(0, 8) });
      return null;
    }

    if (metadata.expiresAt < new Date()) {
      this.logger.debug({
        msg: 'Access token expired',
        tokenPrefix: token.substring(0, 8),
        expiredAt: metadata.expiresAt,
      });
      await this.store.removeAccessToken(token);
      return null;
    }

    return {
      userId: metadata.userId,
      clientId: metadata.clientId,
      scope: metadata.scope,
      resource: metadata.resource,
      userProfileId: metadata.userProfileId,
      userData: metadata.userData,
    };
  }

  public async validateRefreshToken(token: string): Promise<RefreshTokenMetadata | null> {
    const metadata = await this.store.getRefreshToken(token);

    if (!metadata) {
      this.logger.debug({ msg: 'Refresh token not found', tokenPrefix: token.substring(0, 8) });
      return null;
    }

    if (metadata.expiresAt < new Date()) {
      this.logger.debug({
        msg: 'Refresh token expired',
        tokenPrefix: token.substring(0, 8),
        expiredAt: metadata.expiresAt,
      });
      await this.store.removeRefreshToken(token);
      return null;
    }

    return metadata;
  }

  public async refreshAccessToken(
    refreshToken: string,
    clientId: string,
  ): Promise<TokenPair | null> {
    const metadata = await this.validateRefreshToken(refreshToken);

    if (!metadata) return null;

    if (metadata.clientId !== clientId) {
      this.logger.warn({
        msg: 'Client ID mismatch during token refresh',
        expected: metadata.clientId,
        provided: clientId,
      });
      return null;
    }

    // Rotate refresh token
    await this.store.removeRefreshToken(refreshToken);
    return this.generateTokenPair(
      metadata.userId,
      metadata.clientId,
      metadata.scope,
      metadata.resource,
      metadata.userProfileId,
    );
  }

  public async revokeToken(
    token: string,
    tokenType: 'access' | 'refresh' = 'access',
  ): Promise<boolean> {
    try {
      if (tokenType === 'access') {
        await this.store.removeAccessToken(token);
      } else {
        await this.store.removeRefreshToken(token);
      }

      this.logger.debug({
        msg: 'Token revoked',
        tokenType,
        tokenPrefix: token.substring(0, 8),
      });

      return true;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to revoke token',
        tokenType,
        error,
      });
      return false;
    }
  }
}
