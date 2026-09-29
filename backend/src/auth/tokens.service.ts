import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Role } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.module.js';
import type { JwtPayload } from '../common/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until the access token expires
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Access token  = short-lived JWT (15 min), sent on every request.
 * Refresh token = long-lived random string "<id>.<secret>", only its hash is stored.
 * Every refresh "rotates" it: the old one is revoked and a new one is issued.
 * If someone uses an already-revoked token, it was probably stolen, so we revoke them all.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async issue(user: { id: string; email: string; role: Role }, meta: ClientMeta = {}): Promise<TokenPair> {
    const refresh = await this.createRefreshToken(user.id, meta);
    return { ...(await this.signAccess(user)), refreshToken: refresh };
  }

  async rotate(presented: string, meta: ClientMeta = {}) {
    const record = await this.findValid(presented);

    // Revoke the old token only if nobody else did it at the same moment.
    const newSecret = randomBytes(32).toString('base64url');
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: record.userId,
          tokenHash: sha256(newSecret),
          expiresAt: this.refreshExpiry(),
          userAgent: meta.userAgent,
          ip: meta.ip,
        },
      });
      const revoked = await tx.refreshToken.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: new Date(), replacedBy: created.id },
      });
      if (revoked.count === 0) throw new UnauthorizedException('Refresh token already used');
      return { user: record.user, newToken: `${created.id}.${newSecret}` };
    });

    return { user: user.user, tokens: { ...(await this.signAccess(user.user)), refreshToken: user.newToken } };
  }

  async revoke(presented: string) {
    const parsed = this.parse(presented);
    if (!parsed) return;
    await this.prisma.refreshToken.updateMany({
      where: { id: parsed.id, tokenHash: sha256(parsed.secret), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async findValid(presented: string) {
    const parsed = this.parse(presented);
    if (!parsed) throw new UnauthorizedException('Invalid refresh token');

    const record = await this.prisma.refreshToken.findUnique({
      where: { id: parsed.id },
      include: { user: { select: { id: true, email: true, role: true, status: true } } },
    });
    if (!record || !safeEqual(record.tokenHash, sha256(parsed.secret))) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (record.revokedAt) {
      await this.revokeAllForUser(record.userId);
      await this.audit.log({
        actorId: record.userId,
        action: 'auth.refresh_token_reuse',
        entityType: 'User',
        entityId: record.userId,
      });
      throw new UnauthorizedException('Refresh token reuse detected. Please log in again.');
    }
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');
    if (record.user.status !== 'ACTIVE') throw new UnauthorizedException('Account is suspended');
    return record;
  }

  private async createRefreshToken(userId: string, meta: ClientMeta) {
    const secret = randomBytes(32).toString('base64url');
    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(secret),
        expiresAt: this.refreshExpiry(),
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });
    return `${record.id}.${secret}`;
  }

  private async signAccess(user: { id: string; email: string; role: Role }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresIn: this.config.get<number>('JWT_ACCESS_TTL_SECONDS', 900),
    };
  }

  private refreshExpiry() {
    const days = this.config.get<number>('REFRESH_TOKEN_TTL_DAYS', 30);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private parse(token: string) {
    const [id, secret] = token.split('.');
    const uuid = /^[0-9a-f-]{36}$/i;
    return id && secret && uuid.test(id) ? { id, secret } : null;
  }
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
