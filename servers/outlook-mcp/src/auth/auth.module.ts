import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { ConfigurableModuleClass } from './auth.module-definition';
import { McpAuthJwtGuard } from './guards/mcp-auth-jwt.guard';
import { McpOAuthStore } from './mcp-oauth.store';
import { AuthService } from './services/auth.service';
import { ClientService } from './services/client.service';
import { JwtTokenService } from './services/jwt-token.service';
import { OAuthStrategyService } from './services/oauth-strategy.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    McpOAuthStore,
    ClientService,
    JwtTokenService,
    OAuthStrategyService,
    McpAuthJwtGuard,
  ],
  exports: [JwtTokenService, McpAuthJwtGuard],
})
export class AuthModule extends ConfigurableModuleClass {}
