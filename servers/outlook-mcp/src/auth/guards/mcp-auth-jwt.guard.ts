import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { type CustomTokenPayload, JwtTokenService } from '../services/jwt-token.service';

// Extend the AuthenticatedRequest to properly type the user property with our custom claims
export interface McpAuthenticatedRequest extends Request {
  user?: CustomTokenPayload;
}

@Injectable()
export class McpAuthJwtGuard implements CanActivate {
  public constructor(private readonly jwtTokenService: JwtTokenService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<McpAuthenticatedRequest>();
    
    // This is a global guard, as we cannot inject it into the McpModule
    // To not interfere with authentication and other routes, we only authenticate requests to /mcp endpoints
    if (!request.url.startsWith('/mcp')) return true; 

    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('Access token required');

    const payload = this.jwtTokenService.validateToken(token);
    if (!payload) throw new UnauthorizedException('Invalid or expired access token');

    request.user = payload;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
