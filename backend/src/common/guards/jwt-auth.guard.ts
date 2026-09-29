import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators.js';
import type { AuthUser, JwtPayload } from '../types/auth-user.js';

// Registered globally: checks the "Authorization: Bearer <token>" header on every request.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      request.user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      // A bad token on a public route is ignored; on a protected route it is rejected.
      if (!isPublic) throw new UnauthorizedException('Invalid or expired access token');
    }
    return true;
  }
}

export function extractBearerToken(header: string | undefined): string | undefined {
  const [type, token] = header?.split(' ') ?? [];
  return type === 'Bearer' && token ? token : undefined;
}
