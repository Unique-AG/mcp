export { RegisterClientDto } from './dtos/register-client.dto';
export { TokenRequestDto } from './dtos/token-request.dto';
export * from './guards/mcp-auth-jwt.guard';
export type { IEncryptionService } from './interfaces/encryption-service.interface';
export type { IOAuthStore } from './interfaces/io-auth-store.interface';
export type { AuthorizationCode, OAuthClient } from './interfaces/oauth-client.interface';
export type {
  OAuthProviderConfig,
  OAuthSession,
  OAuthUserProfile,
} from './interfaces/oauth-provider.interface';
export * from './mcp-oauth.controller';
export * from './mcp-oauth.module';
export {
  ENCRYPTION_SERVICE_TOKEN,
  MCP_OAUTH_MODULE_OPTIONS_RESOLVED_TOKEN,
  MCP_OAUTH_MODULE_OPTIONS_TOKEN,
  type McpOAuthModuleOptions,
  type McpOAuthModuleOptionsInput,
  OAUTH_STORE_TOKEN,
} from './mcp-oauth.module-definition';
export * from './services/client.service';
export type {
  AccessTokenPayload,
  CustomTokenPayload,
  RefreshTokenPayload,
  TokenPair,
  UserTokenPayload,
} from './services/jwt-token.service';
export * from './services/jwt-token.service';
export * from './services/mcp-oauth.service';
export { OAuthStrategyService, type PassportUser } from './services/oauth-strategy.service';
