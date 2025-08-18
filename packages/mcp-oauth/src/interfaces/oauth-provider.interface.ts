import { z } from 'zod';
import { mcpOAuthModuleOptionsSchema } from '../mcp-oauth.module-definition';

export type OAuthProviderConfig = z.infer<typeof mcpOAuthModuleOptionsSchema>['provider'];

export const oauthUserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(),
  raw: z.any().optional(),
});

export type OAuthUserProfile = z.infer<typeof oauthUserProfileSchema>;

export const oauthSessionSchema = z.object({
  sessionId: z.string(),
  state: z.string(),
  clientId: z.string().optional(),
  redirectUri: z.string().optional(),
  codeChallenge: z.string().optional(),
  codeChallengeMethod: z.string().optional(),
  oauthState: z.string().optional(),
  scope: z.string().optional(),
  resource: z.string().optional(),
  expiresAt: z.number(),
});

export type OAuthSession = z.infer<typeof oauthSessionSchema>;
