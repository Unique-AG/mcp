# Refactored Authentication Architecture

## Proposed Module Structure

```
auth/
├── controllers/
│   ├── auth.controller.ts          # Main OAuth flows
│   ├── client.controller.ts        # Client registration
│   ├── discovery.controller.ts     # Well-known endpoints
│   └── token.controller.ts         # Token operations
├── services/
│   ├── auth.service.ts
│   ├── client.service.ts
│   ├── token/
│   │   ├── jwt-token.service.ts
│   │   ├── token-validator.service.ts
│   │   ├── token-revocation.service.ts
│   │   └── token-introspection.service.ts
│   ├── pkce.service.ts
│   └── crypto.service.ts
├── guards/
│   ├── client-auth.guard.ts
│   ├── rate-limit.guard.ts
│   └── scope.guard.ts
├── filters/
│   └── oauth-error.filter.ts
├── interceptors/
│   ├── audit.interceptor.ts
│   └── security-headers.interceptor.ts
├── decorators/
│   ├── oauth-client.decorator.ts
│   ├── oauth-scopes.decorator.ts
│   └── user-profile.decorator.ts
├── dto/
│   ├── requests/
│   └── responses/
├── entities/
│   └── (Prisma entities)
├── repositories/
│   ├── client.repository.ts
│   ├── token.repository.ts
│   └── session.repository.ts
├── strategies/
│   ├── oauth-strategy.factory.ts
│   └── providers/
│       ├── microsoft.strategy.ts
│       ├── google.strategy.ts
│       └── github.strategy.ts
└── constants/
    ├── oauth.constants.ts
    └── error-codes.constants.ts
```

## Refactored Controller Example

```typescript
// controllers/auth.controller.ts
import { Controller, Get, Post, UseGuards, UseFilters } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { OAuthErrorFilter } from '../filters/oauth-error.filter';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { AuthorizationService } from '../services/authorization.service';
import { OAuthClient } from '../decorators/oauth-client.decorator';
import { AuthorizeDto } from '../dto/requests/authorize.dto';
import { AuthorizeResponseDto } from '../dto/responses/authorize-response.dto';

@ApiTags('OAuth 2.1')
@Controller('auth')
@UseFilters(OAuthErrorFilter)
@UseInterceptors(AuditInterceptor)
export class AuthController {
  constructor(
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Get('authorize')
  @ApiOperation({ summary: 'OAuth 2.1 Authorization Endpoint' })
  @ApiResponse({ status: 302, description: 'Redirect to provider' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async authorize(
    @Query() dto: AuthorizeDto,
    @Res() response: Response,
  ): Promise<void> {
    const redirectUrl = await this.authorizationService.initiateAuthorization(dto);
    response.redirect(redirectUrl);
  }

  @Get('callback')
  @ApiOperation({ summary: 'OAuth provider callback' })
  async callback(
    @Query() query: CallbackDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.authorizationService.handleCallback(query, request);
    response.redirect(result.redirectUrl);
  }
}
```

## Refactored Service with Better Separation

```typescript
// services/authorization.service.ts
import { Injectable } from '@nestjs/common';
import { SessionService } from './session.service';
import { PKCEService } from './pkce.service';
import { ClientService } from './client.service';
import { CodeService } from './code.service';
import { StateValidator } from '../validators/state.validator';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly pkceService: PKCEService,
    private readonly clientService: ClientService,
    private readonly codeService: CodeService,
    private readonly stateValidator: StateValidator,
    private readonly db: PrismaService,
  ) {}

  async initiateAuthorization(dto: AuthorizeDto): Promise<string> {
    // Use transaction for atomicity
    return await this.db.$transaction(async (tx) => {
      // 1. Validate client
      const client = await this.clientService.validateClient(
        dto.clientId,
        dto.redirectUri,
        tx
      );

      // 2. Create session with PKCE
      const session = await this.sessionService.createSession({
        clientId: client.id,
        redirectUri: dto.redirectUri,
        codeChallenge: dto.codeChallenge,
        codeChallengeMethod: dto.codeChallengeMethod,
        scope: dto.scope,
        state: dto.state,
      }, tx);

      // 3. Build provider redirect URL
      return this.buildProviderUrl(session, client);
    });
  }

  async handleCallback(
    query: CallbackDto,
    request: Request
  ): Promise<{ redirectUrl: string }> {
    return await this.db.$transaction(async (tx) => {
      // 1. Validate session
      const session = await this.sessionService.validateSession(
        request.cookies.oauth_session,
        tx
      );

      // 2. Validate state
      this.stateValidator.validate(
        query.state,
        session.state
      );

      // 3. Exchange provider code for tokens
      const providerTokens = await this.exchangeProviderCode(
        query.code,
        session
      );

      // 4. Create user profile
      const profile = await this.userService.upsertProfile(
        providerTokens,
        tx
      );

      // 5. Generate authorization code
      const code = await this.codeService.generateCode({
        userId: profile.id,
        clientId: session.clientId,
        scope: session.scope,
        codeChallenge: session.codeChallenge,
        codeChallengeMethod: session.codeChallengeMethod,
      }, tx);

      // 6. Clean up session
      await this.sessionService.deleteSession(session.id, tx);

      // 7. Build client redirect
      return {
        redirectUrl: this.buildClientRedirect(
          session.redirectUri,
          code,
          session.oauthState
        )
      };
    });
  }
}
```

## Repository Pattern for Data Access

```typescript
// repositories/client.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../services/cache.service';

@Injectable()
export class ClientRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findById(clientId: string, tx?: any): Promise<OAuthClient | null> {
    // Check cache first
    const cached = await this.cache.get(`client:${clientId}`);
    if (cached) return cached;

    const client = await (tx || this.prisma).oAuthClient.findUnique({
      where: { clientId },
      include: {
        redirectUris: true,
        grantTypes: true,
        scopes: true,
      }
    });

    if (client) {
      // Cache for 5 minutes
      await this.cache.set(`client:${clientId}`, client, 300);
    }

    return client;
  }

  async validateRedirectUri(
    clientId: string,
    redirectUri: string,
    tx?: any
  ): Promise<boolean> {
    const client = await this.findById(clientId, tx);
    if (!client) return false;

    // Exact match required for security
    return client.redirectUris.some(uri => uri.uri === redirectUri);
  }

  async create(data: CreateClientDto, tx?: any): Promise<OAuthClient> {
    return await (tx || this.prisma).oAuthClient.create({
      data: {
        ...data,
        clientId: this.generateClientId(),
        clientSecret: this.generateClientSecret(data.tokenEndpointAuthMethod),
      }
    });
  }

  private generateClientId(): string {
    return typeid('client').toString();
  }

  private generateClientSecret(authMethod: string): string | null {
    if (authMethod === 'none') return null;
    return randomBytes(32).toString('base64url');
  }
}
```

## Enhanced Security with Guards

```typescript
// guards/client-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ClientService } from '../services/client.service';

@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(private readonly clientService: ClientService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      // Check body for client credentials
      const { client_id, client_secret } = request.body;
      if (!client_id) return false;

      const client = await this.clientService.validateClient(
        client_id,
        client_secret
      );
      
      if (!client) return false;
      request.client = client;
      return true;
    }

    // Handle Basic auth
    if (authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(
        authHeader.slice(6),
        'base64'
      ).toString();
      
      const [clientId, clientSecret] = credentials.split(':');
      const client = await this.clientService.validateClient(
        clientId,
        clientSecret
      );
      
      if (!client) return false;
      request.client = client;
      return true;
    }

    return false;
  }
}
```

## Configuration with Validation

```typescript
// config/oauth.config.ts
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const OAuthConfigSchema = z.object({
  issuer: z.string().url(),
  authorizationEndpoint: z.string(),
  tokenEndpoint: z.string(),
  jwks: {
    privateKeyPath: z.string(),
    publicKeyPath: z.string(),
    keyId: z.string(),
    algorithm: z.enum(['RS256', 'RS384', 'RS512']).default('RS256'),
  },
  tokens: {
    accessTokenTTL: z.number().default(3600),
    refreshTokenTTL: z.number().default(2592000),
    authorizationCodeTTL: z.number().default(600),
    idTokenTTL: z.number().default(3600),
  },
  security: {
    requirePKCE: z.boolean().default(true),
    allowPublicClients: z.boolean().default(true),
    requireRequestObjects: z.boolean().default(false),
    supportDPoP: z.boolean().default(false),
  },
  encryption: {
    key: z.string().min(32),
    algorithm: z.enum(['aes-256-gcm', 'aes-256-cbc']).default('aes-256-gcm'),
  },
});

export default registerAs('oauth', () => {
  const config = {
    issuer: process.env.OAUTH_ISSUER,
    authorizationEndpoint: '/auth/authorize',
    tokenEndpoint: '/auth/token',
    jwks: {
      privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH,
      publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH,
      keyId: process.env.JWT_KEY_ID || 'default',
      algorithm: process.env.JWT_ALGORITHM || 'RS256',
    },
    tokens: {
      accessTokenTTL: parseInt(process.env.ACCESS_TOKEN_TTL || '3600'),
      refreshTokenTTL: parseInt(process.env.REFRESH_TOKEN_TTL || '2592000'),
      authorizationCodeTTL: parseInt(process.env.AUTH_CODE_TTL || '600'),
      idTokenTTL: parseInt(process.env.ID_TOKEN_TTL || '3600'),
    },
    security: {
      requirePKCE: process.env.REQUIRE_PKCE !== 'false',
      allowPublicClients: process.env.ALLOW_PUBLIC_CLIENTS !== 'false',
      requireRequestObjects: process.env.REQUIRE_REQUEST_OBJECTS === 'true',
      supportDPoP: process.env.SUPPORT_DPOP === 'true',
    },
    encryption: {
      key: process.env.ENCRYPTION_KEY!,
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    },
  };

  // Validate configuration
  return OAuthConfigSchema.parse(config);
});
```

## Testing Example

```typescript
// auth.service.spec.ts
describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('PKCE Validation', () => {
    it('should reject invalid code verifier', async () => {
      const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
      const invalidVerifier = 'wrong-verifier';

      await expect(
        service.validatePKCE(invalidVerifier, codeChallenge, 'S256')
      ).rejects.toThrow('Invalid code verifier');
    });

    it('should accept valid S256 challenge', async () => {
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      const result = await service.validatePKCE(verifier, challenge, 'S256');
      expect(result).toBe(true);
    });
  });

  describe('Token Exchange', () => {
    it('should prevent authorization code reuse', async () => {
      const code = 'test-auth-code';
      
      // First use should succeed
      await service.exchangeAuthorizationCode(code);
      
      // Second use should fail
      await expect(
        service.exchangeAuthorizationCode(code)
      ).rejects.toThrow('Authorization code already used');
    });
  });
});
```
