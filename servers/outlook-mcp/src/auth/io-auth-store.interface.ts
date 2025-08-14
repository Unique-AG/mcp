import { AuthorizationCode, OAuthClient, OAuthSession, OAuthUserProfile } from '@rekog/mcp-nest';
import { PassportUser } from './services/oauth-strategy.service';

export interface IOAuthStore {
  // Client management
  storeClient(client: OAuthClient): Promise<OAuthClient>;
  getClient(client_id: string): Promise<OAuthClient | undefined>;
  findClient(client_name: string): Promise<OAuthClient | undefined>;
  generateClientId(client: OAuthClient): string;

  // Authorization code management
  storeAuthCode(code: AuthorizationCode): Promise<void>;
  getAuthCode(code: string): Promise<AuthorizationCode | undefined>;
  removeAuthCode(code: string): Promise<void>;

  // OAuth session management
  storeOAuthSession(sessionId: string, session: OAuthSession): Promise<void>;
  getOAuthSession(sessionId: string): Promise<OAuthSession | undefined>;
  removeOAuthSession(sessionId: string): Promise<void>;

  // User profile management
  /**
   * Upsert a user profile from an OAuth provider and return a stable profile_id.
   * The profile_id should be stable across logins for the same provider+user.
   */
  upsertUserProfile(user: PassportUser): Promise<string>;

  /** Retrieve a stored user profile by its profile_id */
  getUserProfileById(
    profileId: string,
  ): Promise<(OAuthUserProfile & { profile_id: string; provider: string }) | undefined>;
}
