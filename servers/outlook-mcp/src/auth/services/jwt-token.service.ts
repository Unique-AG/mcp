import { Inject, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { typeid } from 'typeid-js';
import { AUTH_MODULE_OPTIONS_TOKEN, type AuthModuleOptions } from '../auth.module-definition';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface BaseTokenPayload extends JwtPayload {
  sub: string; // User ID
  iss?: string; // Issuer
  aud?: string | string[]; // Audience
  jti?: string; // JWT ID
}

export interface AccessTokenPayload extends BaseTokenPayload {
  type: 'access';
  azp: string; // Authorized party (client ID)
  resource: string;
  scope: string;
  user_profile_id?: string;
  user_data?: unknown;
}

export interface RefreshTokenPayload extends BaseTokenPayload {
  type: 'refresh';
  client_id: string;
  scope: string;
  resource: string;
  user_profile_id?: string;
  user_data?: unknown;
}

export interface UserTokenPayload extends BaseTokenPayload {
  type: 'user';
  user_data: unknown;
}

export type CustomTokenPayload = AccessTokenPayload | RefreshTokenPayload | UserTokenPayload;

@Injectable()
export class JwtTokenService {
  public constructor(
    @Inject(AUTH_MODULE_OPTIONS_TOKEN) private readonly options: AuthModuleOptions,
  ) {}

  public generateTokenPair(
    userId: string,
    clientId: string,
    scope = '',
    resource: string,
    extras?: { user_profile_id?: string; user_data?: unknown },
  ): TokenPair {
    const jti = typeid('jti').toString();

    const accessTokenPayload = {
      sub: userId,
      azp: clientId,
      iss: this.options.jwtIssuer,
      aud: resource,
      resource: resource,
      type: 'access' as const,
      user_profile_id: extras?.user_profile_id,
      user_data: extras?.user_data,
      scope,
    };

    const refreshTokenPayload = {
      sub: userId,
      client_id: clientId,
      scope,
      resource,
      type: 'refresh' as const,
      jti: `refresh_${jti}`,
      iss: this.options.jwtIssuer,
      aud: resource,
      user_profile_id: extras?.user_profile_id,
    };

    const accessToken = jwt.sign(accessTokenPayload, this.options.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: this.options.jwtAccessTokenExpiresIn,
    });

    const refreshToken = jwt.sign(refreshTokenPayload, this.options.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: this.options.jwtRefreshTokenExpiresIn,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: this.options.jwtAccessTokenExpiresIn,
    };
  }

  public validateToken(token: string): CustomTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.options.jwtSecret, {
        algorithms: ['HS256'],
      });

      if (typeof decoded === 'string') return null;

      return decoded as CustomTokenPayload;
    } catch {
      return null;
    }
  }

  public refreshAccessToken(refreshToken: string, clientId: string): TokenPair | null {
    const payload = this.validateToken(refreshToken);

    if (!payload || payload.type !== 'refresh') return null;
    if (payload.client_id !== clientId) return null;
    if (!payload.client_id || !payload.sub) return null;

    return this.generateTokenPair(payload.sub, payload.client_id, payload.scope, payload.resource, {
      user_profile_id: payload.user_profile_id,
      user_data: payload.user_data,
    });
  }

  public generateUserToken(userId: string, userData: unknown): string {
    const jti = typeid('jti').toString();
    const serverUrl = this.options.serverUrl;

    const payload = {
      sub: userId,
      type: 'user',
      user_data: userData,
      jti,
      iss: serverUrl,
      aud: 'mcp-client',
    };

    return jwt.sign(payload, this.options.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: this.options.jwtUserTokenExpiresIn,
    });
  }
}
