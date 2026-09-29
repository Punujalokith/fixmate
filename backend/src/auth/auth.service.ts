import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicUserSelect } from '../users/user.select.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { ClientMeta, TokensService } from './tokens.service.js';

const BCRYPT_ROUNDS = 10;
// Used when the email doesn't exist, so login takes the same time either way
// (stops attackers from discovering which emails are registered).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto, meta: ClientMeta) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, ...(dto.phone ? [{ phone: dto.phone }] : [])] },
      select: { email: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'Email is already registered' : 'Phone is already registered',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        fullName: dto.fullName,
        role: dto.role ?? 'CUSTOMER',
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        lastLoginAt: new Date(),
      },
      select: publicUserSelect,
    });
    await this.audit.log({ actorId: user.id, action: 'auth.register', entityType: 'User', entityId: user.id, ip: meta.ip });

    return { user, ...(await this.tokens.issue(user, meta)) };
  }

  async login(dto: LoginDto, meta: ClientMeta) {
    const found = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const passwordOk = await bcrypt.compare(dto.password, found?.passwordHash ?? DUMMY_HASH);
    if (!found || !passwordOk) throw new UnauthorizedException('Invalid email or password');
    if (found.status !== 'ACTIVE') throw new ForbiddenException('Your account is suspended. Contact support.');

    const user = await this.prisma.user.update({
      where: { id: found.id },
      data: { lastLoginAt: new Date() },
      select: publicUserSelect,
    });
    return { user, ...(await this.tokens.issue(user, meta)) };
  }

  async refresh(refreshToken: string, meta: ClientMeta) {
    const { tokens } = await this.tokens.rotate(refreshToken, meta);
    return tokens;
  }

  async logout(refreshToken: string) {
    await this.tokens.revoke(refreshToken);
  }

  async logoutAll(userId: string) {
    await this.tokens.revokeAllForUser(userId);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...publicUserSelect, business: { select: { id: true, name: true, isVerified: true } } },
    });
    if (!user) throw new UnauthorizedException('User no longer exists');
    return user;
  }
}
