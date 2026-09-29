import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.module.js';
import { TokensService } from '../auth/tokens.service.js';
import { ReviewsService } from '../bookings/reviews.service.js';
import { CATEGORIES_CACHE_KEY } from '../categories/categories.service.js';
import { pageArgs, paginated } from '../common/dto/pagination.dto.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/redis.module.js';
import { publicUserSelect } from '../users/user.select.js';
import type {
  AdminBookingsQueryDto,
  AdminBusinessesQueryDto,
  AdminReviewsQueryDto,
  AdminUsersQueryDto,
  CreateCategoryDto,
  SetUserStatusDto,
  UpdateBusinessAdminDto,
  UpdateCategoryDto,
} from './dto/admin.dto.js';

const insensitive = (value: string) => ({ contains: value, mode: 'insensitive' as const });
const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tokens: TokensService,
    private readonly reviews: ReviewsService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
  ) {}

  // ─────────────── Overview ───────────────

  async stats() {
    const since30 = new Date(Date.now() - 30 * DAY);
    const since14 = new Date(Date.now() - 13 * DAY);
    since14.setHours(0, 0, 0, 0);

    const [users, businesses, verified, bookingsByStatus, revenueAll, revenue30, daily, topCategories, ai] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.business.count(),
      this.prisma.business.count({ where: { isVerified: true } }),
      this.prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID', paidAt: { gte: since30 } }, _sum: { amount: true } }),
      this.prisma.$queryRaw<{ day: Date; bookings: number; completed: number }[]>`
        SELECT date_trunc('day', "createdAt") AS day,
               COUNT(*)::int AS bookings,
               COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed
        FROM bookings
        WHERE "createdAt" >= ${since14}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<{ name: string; slug: string; bookings: number }[]>`
        SELECT c.name, c.slug, COUNT(b.id)::int AS bookings
        FROM categories c
        LEFT JOIN services s ON s."categoryId" = c.id
        LEFT JOIN bookings b ON b."serviceId" = s.id
        GROUP BY c.id ORDER BY bookings DESC, c.name LIMIT 8`,
      this.aiUsageSummary(since30),
    ]);

    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(since14.getTime() + i * DAY);
      const row = daily.find((r) => new Date(r.day).toDateString() === d.toDateString());
      return { day: d.toISOString().slice(0, 10), bookings: row?.bookings ?? 0, completed: row?.completed ?? 0 };
    });
    const totalBookings = bookingsByStatus.reduce((sum, s) => sum + s._count._all, 0);
    const completed = bookingsByStatus.find((s) => s.status === 'COMPLETED')?._count._all ?? 0;

    return {
      users: Object.fromEntries(users.map((u) => [u.role, u._count._all])),
      businesses: { total: businesses, verified },
      bookings: {
        total: totalBookings,
        byStatus: Object.fromEntries(bookingsByStatus.map((s) => [s.status, s._count._all])),
        completionRate: totalBookings ? Math.round((completed / totalBookings) * 100) : 0,
        daily: days,
      },
      revenue: { allTime: Number(revenueAll._sum.amount ?? 0), last30Days: Number(revenue30._sum.amount ?? 0) },
      topCategories,
      ai,
    };
  }

  // ─────────────── Users ───────────────

  async users(query: AdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      status: query.status,
      ...(query.q && { OR: [{ fullName: insensitive(query.q) }, { email: insensitive(query.q) }, { phone: { contains: query.q } }] }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          ...publicUserSelect,
          lastLoginAt: true,
          business: { select: { id: true, name: true, isVerified: true } },
          _count: { select: { bookings: true } },
        },
        ...pageArgs(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async setUserStatus(admin: AuthUser, userId: string, dto: SetUserStatusDto, ip?: string) {
    if (userId === admin.id) throw new BadRequestException('You cannot change your own status');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') throw new BadRequestException('Admins cannot be suspended here');

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { status: dto.status }, select: publicUserSelect });
    if (dto.status === 'SUSPENDED') await this.tokens.revokeAllForUser(userId); // kicks them out within 15 min
    await this.audit.log({
      actorId: admin.id,
      action: dto.status === 'SUSPENDED' ? 'user.suspend' : 'user.activate',
      entityType: 'User',
      entityId: userId,
      metadata: { reason: dto.reason ?? null },
      ip,
    });
    return updated;
  }

  // ─────────────── Businesses ───────────────

  async businesses(query: AdminBusinessesQueryDto) {
    const where: Prisma.BusinessWhereInput = {
      ...(query.verified !== undefined && { isVerified: query.verified }),
      ...(query.q && { OR: [{ name: insensitive(query.q) }, { city: insensitive(query.q) }, { owner: { email: insensitive(query.q) } }] }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        orderBy: [{ isVerified: 'asc' }, { createdAt: 'desc' }],
        include: {
          owner: { select: { id: true, fullName: true, email: true, phone: true, status: true } },
          _count: { select: { services: true, bookings: true } },
        },
        ...pageArgs(query),
      }),
      this.prisma.business.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async updateBusiness(admin: AuthUser, id: string, dto: UpdateBusinessAdminDto, ip?: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    const updated = await this.prisma.business.update({ where: { id }, data: dto });

    await this.audit.log({ actorId: admin.id, action: 'business.update', entityType: 'Business', entityId: id, metadata: { ...dto }, ip });
    if (dto.isVerified && !business.isVerified) {
      await this.notifications.notify({
        userId: business.ownerId,
        type: 'SYSTEM',
        title: 'Your business is verified ✔',
        body: 'Customers now see a verified badge on your profile.',
      });
    }
    return updated;
  }

  // ─────────────── Bookings ───────────────

  async bookings(query: AdminBookingsQueryDto) {
    const where: Prisma.BookingWhereInput = {
      status: query.status,
      ...(query.q && { OR: [{ code: insensitive(query.q) }, { serviceTitle: insensitive(query.q) }] }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, fullName: true, email: true } },
          business: { select: { id: true, name: true } },
          payment: { select: { status: true, amount: true, method: true } },
        },
        ...pageArgs(query),
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  // ─────────────── Reviews ───────────────

  async reviewsList(query: AdminReviewsQueryDto) {
    const where: Prisma.ReviewWhereInput = {
      ...(query.hidden !== undefined && { isHidden: query.hidden }),
      ...(query.maxRating && { rating: { lte: query.maxRating } }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, fullName: true, email: true } },
          business: { select: { id: true, name: true } },
          booking: { select: { code: true, serviceTitle: true } },
        },
        ...pageArgs(query),
      }),
      this.prisma.review.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async moderateReview(admin: AuthUser, id: string, isHidden: boolean, ip?: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    const updated = await this.prisma.review.update({ where: { id }, data: { isHidden } });
    await this.reviews.recalculateRating(review.businessId);
    await this.audit.log({ actorId: admin.id, action: isHidden ? 'review.hide' : 'review.show', entityType: 'Review', entityId: id, ip });
    return updated;
  }

  // ─────────────── Categories ───────────────

  async createCategory(admin: AuthUser, dto: CreateCategoryDto) {
    const category = await this.prisma.category.create({ data: dto });
    await this.cache.invalidate(CATEGORIES_CACHE_KEY);
    await this.audit.log({ actorId: admin.id, action: 'category.create', entityType: 'Category', entityId: category.id });
    return category;
  }

  async updateCategory(admin: AuthUser, id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.update({ where: { id }, data: dto });
    await this.cache.invalidate(CATEGORIES_CACHE_KEY);
    await this.audit.log({ actorId: admin.id, action: 'category.update', entityType: 'Category', entityId: id, metadata: { ...dto } });
    return category;
  }

  listCategories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { services: true } } },
    });
  }

  // ─────────────── AI usage ───────────────

  async aiUsage() {
    const since = new Date(Date.now() - 30 * DAY);
    const [summary, daily, recent] = await Promise.all([
      this.aiUsageSummary(since),
      this.prisma.$queryRaw<{ day: Date; requests: number; tokens: number }[]>`
        SELECT date_trunc('day', "createdAt") AS day,
               COUNT(*)::int AS requests,
               COALESCE(SUM("inputTokens" + "outputTokens"), 0)::int AS tokens
        FROM ai_requests WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.aiRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { fullName: true, email: true } } },
      }),
    ]);
    return { ...summary, daily: daily.map((d) => ({ ...d, day: new Date(d.day).toISOString().slice(0, 10) })), recent };
  }

  private async aiUsageSummary(since: Date) {
    const [agg, failed] = await Promise.all([
      this.prisma.aiRequest.aggregate({
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
        _avg: { latencyMs: true },
      }),
      this.prisma.aiRequest.count({ where: { createdAt: { gte: since }, success: false } }),
    ]);
    const requests = agg._count._all;
    return {
      requests30d: requests,
      inputTokens30d: agg._sum.inputTokens ?? 0,
      outputTokens30d: agg._sum.outputTokens ?? 0,
      avgLatencyMs: Math.round(agg._avg.latencyMs ?? 0),
      successRate: requests ? Math.round(((requests - failed) / requests) * 100) : 100,
    };
  }
}
