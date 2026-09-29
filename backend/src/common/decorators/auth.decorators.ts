import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '../../generated/prisma/client.js';
import type { AuthUser } from '../types/auth-user.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

// Every route needs a valid token by default. @Public() opens a route to everyone.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// @Roles('PROVIDER') — only users with one of these roles may call the route.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// @CurrentUser() user: AuthUser — the logged-in user from the access token.
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
  return request.user;
});
