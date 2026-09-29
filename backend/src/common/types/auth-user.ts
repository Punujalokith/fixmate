import type { Role } from '../../generated/prisma/client.js';

// What we know about the logged-in user on every request (read from the access token).
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
