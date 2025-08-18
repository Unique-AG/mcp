# OAuth 2.1 Security Improvements & Recommendations

## Critical Security Fixes Required

### 1. Token Encryption in Database
```typescript
// crypto.service.ts
import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private key: Buffer;

  async onModuleInit() {
    const password = process.env.ENCRYPTION_KEY!;
    this.key = await promisify(scrypt)(password, 'salt', 32) as Buffer;
  }

  encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex')
    };
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = createDecipheriv(
      this.algorithm, 
      this.key, 
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### 2. Implement RS256 JWT Signing
```typescript
// jwt-token.service.ts
import { readFileSync } from 'fs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtTokenService {
  private privateKey: string;
  private publicKey: string;

  constructor() {
    this.privateKey = readFileSync('keys/private.pem', 'utf8');
    this.publicKey = readFileSync('keys/public.pem', 'utf8');
  }

  generateTokenPair(...): TokenPair {
    const accessToken = jwt.sign(accessTokenPayload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.options.jwtAccessTokenExpiresIn,
      keyid: 'key-1' // Add key rotation support
    });
    // ...
  }

  // Add JWKS endpoint support
  getJWKS() {
    return {
      keys: [{
        kty: 'RSA',
        use: 'sig',
        kid: 'key-1',
        n: '...', // RSA modulus
        e: 'AQAB', // RSA exponent
        alg: 'RS256'
      }]
    };
  }
}
```

### 3. Add Rate Limiting
```typescript
// auth.controller.ts
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller()
@UseGuards(ThrottlerGuard)
export class AuthController {
  @Post(OAUTH_ENDPOINTS.token)
  @Throttle(10, 60) // 10 requests per minute
  async token(@Body() tokenDto: TokenRequestDto) {
    // ...
  }
}
```

### 4. Implement Token Revocation
```typescript
// auth.controller.ts
@Post(OAUTH_ENDPOINTS.revoke)
@HttpCode(HttpStatus.OK)
async revoke(@Body() body: RevokeTokenDto) {
  const { token, token_type_hint, client_id, client_secret } = body;
  
  // Validate client credentials
  const client = await this.clientService.getClient(client_id);
  this.validateClientAuthentication(client, client_secret);
  
  // Revoke token
  await this.tokenService.revokeToken(token, token_type_hint);
  
  return {}; // 200 OK with empty body per spec
}
```

### 5. Add Token Introspection
```typescript
// auth.controller.ts
@Post('/auth/introspect')
async introspect(@Body() body: IntrospectDto) {
  const { token, token_type_hint, client_id, client_secret } = body;
  
  // Validate resource server credentials
  const client = await this.clientService.getClient(client_id);
  this.validateClientAuthentication(client, client_secret);
  
  const tokenInfo = await this.tokenService.introspectToken(token);
  
  if (!tokenInfo) {
    return { active: false };
  }
  
  return {
    active: true,
    scope: tokenInfo.scope,
    client_id: tokenInfo.client_id,
    username: tokenInfo.username,
    exp: tokenInfo.exp,
    iat: tokenInfo.iat,
    sub: tokenInfo.sub,
    aud: tokenInfo.aud,
    iss: tokenInfo.iss,
    jti: tokenInfo.jti
  };
}
```

### 6. Implement Proper Error Responses
```typescript
// oauth-error.filter.ts
@Catch()
export class OAuthErrorFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let error = 'server_error';
    let errorDescription = 'An unexpected error occurred';
    let statusCode = 500;
    
    if (exception instanceof BadRequestException) {
      error = 'invalid_request';
      errorDescription = exception.message;
      statusCode = 400;
    } else if (exception instanceof UnauthorizedException) {
      error = 'invalid_client';
      errorDescription = exception.message;
      statusCode = 401;
    }
    
    response.status(statusCode).json({
      error,
      error_description: errorDescription,
      error_uri: 'https://example.com/docs/errors/' + error
    });
  }
}
```

### 7. Add DPoP Support (Demonstration Proof of Possession)
```typescript
// dpop.service.ts
@Injectable()
export class DPoPService {
  validateDPoPProof(
    proof: string, 
    httpMethod: string, 
    httpUri: string,
    accessToken?: string
  ): boolean {
    const decoded = jwt.decode(proof, { complete: true });
    
    // Validate DPoP proof JWT
    // 1. Verify signature with public key from header
    // 2. Check htm (HTTP method) claim
    // 3. Check htu (HTTP URI) claim
    // 4. Check iat is recent (within 60 seconds)
    // 5. Check jti for replay attacks
    // 6. If access token, check ath (access token hash)
    
    return true;
  }
}
```

### 8. Implement Pushed Authorization Requests (PAR)
```typescript
// par.controller.ts
@Post('/auth/par')
async pushAuthorizationRequest(@Body() body: any) {
  // Store authorization request server-side
  const requestUri = `urn:ietf:params:oauth:request_uri:${randomBytes(32).toString('hex')}`;
  
  await this.store.storePAR(requestUri, {
    ...body,
    expires_at: Date.now() + 60000 // 60 seconds
  });
  
  return {
    request_uri: requestUri,
    expires_in: 60
  };
}
```

## Additional Recommendations

### Security Headers
```typescript
// main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Audit Logging
```typescript
// audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    
    return next.handle().pipe(
      tap((data) => {
        // Log successful operations
        this.auditLogger.log({
          timestamp: new Date(),
          method,
          url,
          ip,
          userAgent: headers['user-agent'],
          result: 'success',
          responseTime: Date.now() - request.startTime
        });
      }),
      catchError((error) => {
        // Log failures
        this.auditLogger.error({
          timestamp: new Date(),
          method,
          url,
          ip,
          error: error.message,
          result: 'failure'
        });
        throw error;
      })
    );
  }
}
```

### Database Transactions
```typescript
// auth.service.ts
async exchangeAuthorizationCodeForToken(tokenDto: TokenRequestDto) {
  return await this.prisma.$transaction(async (tx) => {
    // All operations in a transaction
    const authCode = await tx.authorizationCode.findUnique({
      where: { code: tokenDto.code }
    });
    
    // Validate...
    
    // Mark as used atomically
    await tx.authorizationCode.update({
      where: { code: tokenDto.code },
      data: { usedAt: new Date() }
    });
    
    // Generate tokens...
    
    return tokenPair;
  });
}
```

## Testing Requirements

1. **Security Tests**
   - PKCE validation with invalid verifiers
   - Token replay attack prevention
   - SQL injection attempts
   - XSS in redirect_uri
   - CSRF token validation

2. **Compliance Tests**
   - OAuth 2.1 flow validation
   - Error response format
   - Token expiration handling
   - Scope validation

3. **Load Tests**
   - Token endpoint rate limiting
   - Database connection pooling
   - JWT signing performance

## Monitoring & Observability

1. Add OpenTelemetry for distributed tracing
2. Implement Prometheus metrics for:
   - Token generation rate
   - Failed authentication attempts
   - Token expiration events
   - Database query performance

3. Set up alerts for:
   - Unusual number of failed authentications
   - Token generation spikes
   - Database connection issues
   - Certificate expiration

## Compliance Checklist

- [ ] GDPR compliance for user data
- [ ] Token rotation policy
- [ ] Secure key management (use AWS KMS or similar)
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Dependency vulnerability scanning
- [ ] Secret scanning in code
