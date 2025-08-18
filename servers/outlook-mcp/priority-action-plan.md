# OAuth 2.1 Implementation - Priority Action Plan

## 🔴 P0 - Critical Security Issues (Fix Immediately)

### 1. **Encrypt Tokens in Database** [CRITICAL]
**Issue**: Provider access/refresh tokens stored in plaintext (line 132-134, mcp-oauth.store.ts)
```typescript
// Current: VULNERABLE
accessToken,
refreshToken,

// Fix: Use encryption service
accessToken: await this.crypto.encrypt(accessToken),
refreshToken: await this.crypto.encrypt(refreshToken),
```
**Impact**: Data breach would expose all user tokens
**Effort**: 2-3 hours

### 2. **Switch from HS256 to RS256** [CRITICAL]
**Issue**: Using symmetric signing exposes secret to all clients
```typescript
// Current: INSECURE
algorithm: 'HS256'

// Fix: Use asymmetric
algorithm: 'RS256'
```
**Impact**: Any client can forge tokens
**Effort**: 4-6 hours (includes key generation, JWKS endpoint)

### 3. **Remove Sensitive Data from Logs** [HIGH]
**Issue**: Logging full token requests (line 265, auth.controller.ts)
```typescript
// Remove this line
tokenDto, // TODO: remove this
```
**Impact**: Logs contain client secrets and tokens
**Effort**: 30 minutes

## 🟡 P1 - High Priority (Fix This Week)

### 4. **Add Rate Limiting**
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
```
**Impact**: Prevents brute force attacks
**Effort**: 1-2 hours

### 5. **Implement Token Revocation Endpoint**
```typescript
@Post('/auth/revoke')
async revoke(@Body() body: RevokeTokenDto) {
  // Implementation
}
```
**Impact**: Required by OAuth 2.1 spec
**Effort**: 2-3 hours

### 6. **Add Database Transactions**
```typescript
return await this.prisma.$transaction(async (tx) => {
  // Atomic operations
});
```
**Impact**: Prevents race conditions in token exchange
**Effort**: 2-3 hours

### 7. **Validate Redirect URIs Strictly**
```typescript
// Exact match only, no wildcards
return client.redirect_uris.includes(redirectUri);
```
**Impact**: Prevents open redirect attacks
**Effort**: 1 hour

## 🟢 P2 - Important (Fix This Sprint)

### 8. **Add Token Introspection Endpoint**
- Required for resource servers to validate tokens
- Effort: 3-4 hours

### 9. **Implement JWKS Endpoint**
```typescript
@Get('/.well-known/jwks.json')
getJWKS() {
  return { keys: [...] };
}
```
- Required for RS256 validation
- Effort: 2 hours

### 10. **Refactor Controller (Split Responsibilities)**
- Break 277-line controller into smaller, focused controllers
- Effort: 4-6 hours

### 11. **Add Proper OAuth Error Responses**
```typescript
{
  error: 'invalid_request',
  error_description: 'Missing required parameter',
  error_uri: 'https://example.com/docs/errors'
}
```
- Effort: 2-3 hours

## 🔵 P3 - Nice to Have (Next Quarter)

### 12. **Add DPoP Support**
- Demonstration Proof of Possession for enhanced security
- Effort: 1 week

### 13. **Implement PAR (Pushed Authorization Requests)**
- Store auth requests server-side
- Effort: 3-4 days

### 14. **Add OpenTelemetry Tracing**
- Distributed tracing for debugging
- Effort: 2-3 days

### 15. **Implement Key Rotation**
- Automatic JWT signing key rotation
- Effort: 1 week

## Quick Wins (< 1 hour each)

1. ✅ Add `@UseFilters(OAuthErrorFilter)` to controllers
2. ✅ Set secure cookie flags properly
3. ✅ Add input validation for all DTOs
4. ✅ Remove TODO comments from production code
5. ✅ Add security headers with Helmet
6. ✅ Configure CORS properly
7. ✅ Add health check endpoint
8. ✅ Document API with Swagger

## Testing Checklist

- [ ] PKCE validation tests
- [ ] Token replay attack tests
- [ ] Authorization code reuse tests
- [ ] Client authentication tests
- [ ] Scope validation tests
- [ ] Token expiration tests
- [ ] SQL injection tests
- [ ] XSS in redirect_uri tests

## Environment Variables to Add

```env
# Security
ENCRYPTION_KEY=<32+ character key>
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_KEY_ID=key-1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=10

# Token TTLs
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000
AUTH_CODE_TTL=600

# Security Features
REQUIRE_PKCE=true
ALLOW_PUBLIC_CLIENTS=true
SUPPORT_DPOP=false
```

## Monitoring Setup

1. **Add Prometheus Metrics**
```typescript
@Injectable()
export class MetricsService {
  private tokenCounter = new Counter({
    name: 'oauth_tokens_issued',
    help: 'Total tokens issued',
    labelNames: ['type', 'client_id']
  });
}
```

2. **Set Up Alerts**
- Failed auth attempts > 100/hour
- Token generation rate > 1000/minute
- Database response time > 500ms
- Certificate expiring < 30 days

## Recommended Libraries

```json
{
  "dependencies": {
    "@nestjs/throttler": "^5.0.0",
    "helmet": "^7.0.0",
    "jose": "^5.0.0",  // For JWT/JWK operations
    "@opentelemetry/api": "^1.7.0",
    "prom-client": "^15.0.0"
  },
  "devDependencies": {
    "@types/passport-oauth2": "^1.4.0",
    "supertest": "^6.3.0"
  }
}
```

## Summary

Your OAuth 2.1 implementation has a solid foundation with good use of NestJS patterns and TypeScript. However, there are **critical security issues** that need immediate attention:

1. **Unencrypted tokens in database** - Fix TODAY
2. **HS256 instead of RS256** - Fix THIS WEEK
3. **Missing rate limiting** - Fix THIS WEEK

The good news is that your architecture is extensible and most fixes are straightforward to implement. Focus on the P0 items first, then work through P1 items to achieve OAuth 2.1 compliance and security best practices.

**Estimated Total Effort**: 
- P0 (Critical): 1-2 days
- P1 (High): 3-4 days  
- P2 (Important): 1 week
- P3 (Nice to have): 2-3 weeks

Start with encrypting tokens and switching to RS256 - these two changes alone will dramatically improve your security posture.
