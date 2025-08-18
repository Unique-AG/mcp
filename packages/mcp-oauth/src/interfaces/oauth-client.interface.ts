export interface OAuthClient {
  client_id: string;
  client_secret?: string;
  client_name: string;
  client_description?: string;
  logo_uri?: string;
  client_uri?: string;
  developer_name?: string;
  developer_email?: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthorizationCode {
  code: string;
  user_id: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  resource?: string;
  scope?: string;
  expires_at: number;
  used_at?: Date;
  github_access_token: string;
  // Link to stored user profile (if available)
  user_profile_id?: string;
}
