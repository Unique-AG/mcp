import { OAuthProviderConfig } from '@rekog/mcp-nest';
import { Strategy as Microsoft } from 'passport-microsoft';

export const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'User.Read', 'Mail.Read'];

export const MicrosoftOAuthProvider: OAuthProviderConfig = {
  name: 'microsoft',
  strategy: Microsoft,
  strategyOptions: ({ serverUrl, clientId, clientSecret, callbackPath }) => ({
    clientID: clientId,
    clientSecret,
    callbackURL: `${serverUrl}${callbackPath}`,
    scope: SCOPES, // Bug in the library. Needs scope to be set here too.
  }),
  scope: SCOPES,
  profileMapper: (profile) => ({
    id: profile.id,
    username: profile.userPrincipalName,
    email: profile.emails[0]?.value,
    displayName: profile.displayName,
    raw: profile,
  }),
};
