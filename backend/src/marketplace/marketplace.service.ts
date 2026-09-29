import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.module.js';
import { PaginationQueryDto, pageArgs, paginated } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/redis.module.js';
import { CATEGORIES_CACHE_KEY } from '../categories/categories.service.js';
import { validateSlots } from './availability.js';
import type {
  CreateBusinessDto,
  CreateServiceDto,
  SearchBusinessesQueryDto,
  SearchServicesQueryDto,
  SetAvailabilityDto,
  UpdateBusinessDto,
  UpdateServiceDto,
} from './dto/marketplace.dto.js';
import { businessCardSelect, serviceCardInclude } from './marketplace.selects.js';

const insensitive = (value: string) => ({ contains: value, mode: 'insensitive' as const });

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  // ─────────────── Public: search & details ───────────────

  async searchServices(query: SearchServicesQueryDto) {
    const where: Prisma.ServiceWhereInput = {
      isActive: true,
      business: {
        isActive: true,
        owner: { status: 'ACTIVE' },
        ...(query.city && { city: insensitive(query.city) }),
        ...(query.verified && { isVerified: true }),
      },
      category: {
        isActive: true,
        ...(query.category && { slug: query.category }),
      },
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
        price: { gte: query.minPrice, lte: query.maxPrice },
      }),
      ...(query.q && {
        OR: [
          { title: insensitive(query.q) },
          { description: insensitive(query.q) },
          { business: { name: insensitive(query.q) } },
          { category: { name: insensitive(query.q) } },
        ],
      }),
    };

    const orderBy: Prisma.ServiceOrderByWithRelationInput[] = {
      relevance: [{ business: { isVerified: 'desc' as const } }, { business: { ratingAvg: 'desc' as const } }],
      price_asc: [{ price: 'asc' as const }],
      price_desc: [{ price: 'desc' as const }],
      rating: [{ business: { ratingAvg: 'desc' as const } }, { business: { ratingCount: 'desc' as const } }],
      newest: [{ createdAt: 'desc' as const }],
    }[query.sort];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({ where, orderBy: [...orderBy, { id: 'asc' }], include: serviceCardInclude, ...pageArgs(query) }),
      this.prisma.service.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async getService(id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, isActive: true, business: { isActive: true } },
      include: {
        ...serviceCardInclude,
        business: { select: { ...businessCardSelect, description: true, phone: true, serviceRadiusKm: true } },
      },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async searchBusinesses(query: SearchBusinessesQueryDto) {
    const where: Prisma.BusinessWhereInput = {
      isActive: true,
      owner: { status: 'ACTIVE' },
      ...(query.city && { city: insensitive(query.city) }),
      ...(query.verified && { isVerified: true }),
      ...(query.category && { services: { some: { isActive: true, category: { slug: query.category } } } }),
      ...(query.q && {
        OR: [
          { name: insensitive(query.q) },
          { description: insensitive(query.q) },
          { services: { some: { isActive: true, title: insensitive(query.q) } } },
        ],
      }),
    };
    const orderBy: Prisma.BusinessOrderByWithRelationInput[] = {
      rating: [{ ratingAvg: 'desc' as const }, { ratingCount: 'desc' as const }],
      jobs: [{ completedJobs: 'desc' as const }],
      newest: [{ createdAt: 'desc' as const }],
    }[query.sort];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        orderBy: [...orderBy, { id: 'asc' }],
        select: {
          ...businessCardSelect,
          services: {
            where: { isActive: true },
            select: { price: true, category: { select: { name: true, slug: true } } },
          },
        },
        ...pageArgs(query),
      }),
      this.prisma.business.count({ where }),
    ]);

    // Add "starting from" price and the list of categories each business covers.
    const cards = data.map(({ services, ...business }) => ({
      ...business,
      startingPrice: services.length ? Math.min(...services.map((s) => Number(s.price))) : null,
      categories: [...new Map(services.map((s) => [s.category.slug, s.category])).values()],
    }));
    return paginated(cards, total, query);
  }

  async getBusiness(id: string, viewerId?: string) {
    const business = await this.prisma.business.findFirst({
      where: { id, isActive: true },
      include: {
        services: { where: { isActive: true }, include: { category: true }, orderBy: { createdAt: 'asc' } },
        availability: { orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] },
        owner: { select: { fullName: true, avatarUrl: true, createdAt: true } },
      },
    });
    if (!business) throw new NotFoundException('Business not found');

    const isFavourite = viewerId
      ? Boolean(await this.prisma.favourite.findUnique({ where: { userId_businessId: { userId: viewerId, businessId: id } } }))
      : false;
    return { ...business, isFavourite };
  }

  async listReviews(businessId: string, query: PaginationQueryDto) {
    const where = { businessId, isHidden: false };
    const [data, total, breakdown] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { fullName: true, avatarUrl: true } }, booking: { select: { serviceTitle: true } } },
        ...pageArgs(query),
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({ by: ['rating'], where, _count: { _all: true }, orderBy: { rating: 'desc' } }),
    ]);
    const stars = Object.fromEntries([5, 4, 3, 2, 1].map((r) => [r, breakdown.find((b) => b.rating === r)?._count._all ?? 0]));
    return { ...paginated(data, total, query), stars };
  }

  // ─────────────── Provider: my business ───────────────

  async createBusiness(ownerId: string, dto: CreateBusinessDto) {
    const existing = await this.prisma.business.findUnique({ where: { ownerId } });
    if (existing) throw new ConflictException('You already have a business profile');
    const business = await this.prisma.business.create({ data: { ...dto, ownerId } });
    await this.audit.log({ actorId: ownerId, action: 'business.create', entityType: 'Business', entityId: business.id });
    return business;
  }

  async myBusiness(ownerId: string) {
    const business = await this.prisma.business.findUnique({
      where: { ownerId },
      include: {
        services: { include: { category: true }, orderBy: { createdAt: 'asc' } },
        availability: { orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] },
      },
    });
    if (!business) throw new NotFoundException('Create your business profile first');
    return business;
  }

  async updateBusiness(ownerId: string, dto: UpdateBusinessDto) {
    await this.requireBusiness(ownerId);
    return this.prisma.business.update({ where: { ownerId }, data: dto });
  }

  async setAvailability(ownerId: string, dto: SetAvailabilityDto) {
    const business = await this.requireBusiness(ownerId);
    const error = validateSlots(dto.slots);
    if (error) throw new BadRequestException(error);

    return this.prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.deleteMany({ where: { businessId: business.id } });
      await tx.availabilitySlot.createMany({ data: dto.slots.map((s) => ({ ...s, businessId: business.id })) });
      return tx.availabilitySlot.findMany({
        where: { businessId: business.id },
        orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
      });
    });
  }

  // ─────────────── Provider: my services ───────────────

  async createService(ownerId: string, dto: CreateServiceDto) {
    const business = await this.requireBusiness(ownerId);
    await this.requireCategory(dto.categoryId);
    const service = await this.prisma.service.create({
      data: { ...dto, businessId: business.id },
      include: { category: true },
    });
    await this.cache.invalidate(CATEGORIES_CACHE_KEY); // category service counts changed
    return service;
  }

  async updateService(ownerId: string, id: string, dto: UpdateServiceDto) {
    await this.ownService(ownerId, id);
    if (dto.categoryId) await this.requireCategory(dto.categoryId);
    const service = await this.prisma.service.update({ where: { id }, data: dto, include: { category: true } });
    await this.cache.invalidate(CATEGORIES_CACHE_KEY);
    return service;
  }

  /** Soft delete: old bookings still point at the service, so we only hide it. */
  async deleteService(ownerId: string, id: string) {
    await this.ownService(ownerId, id);
    await this.prisma.service.update({ where: { id }, data: { isActive: false } });
    await this.cache.invalidate(CATEGORIES_CACHE_KEY);
  }

  // ─────────────── Provider: dashboard ───────────────

  async dashboard(ownerId: string) {
    const business = await this.requireBusiness(ownerId);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

    const [byStatus, allTime, thisMonth, monthly, upcoming] = await Promise.all([
      this.prisma.booking.groupBy({ by: ['status'], where: { businessId: business.id }, _count: { _all: true } }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID', booking: { businessId: business.id } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: monthStart }, booking: { businessId: business.id } },
        _sum: { amount: true },
      }),
      this.prisma.$queryRaw<{ month: Date; total: number; jobs: number }[]>`
        SELECT date_trunc('month', p."paidAt") AS month,
               COALESCE(SUM(p.amount), 0)::float AS total,
               COUNT(*)::int AS jobs
        FROM payments p
        JOIN bookings b ON b.id = p."bookingId"
        WHERE b."businessId" = ${business.id}::uuid
          AND p.status = 'PAID'
          AND p."paidAt" >= ${sixMonthsAgo}
        GROUP BY 1
        ORDER BY 1`,
      this.prisma.booking.findMany({
        where: { businessId: business.id, status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: { customer: { select: { fullName: true, avatarUrl: true } } },
      }),
    ]);

    // Fill in months with no earnings so the chart always has 6 bars.
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
      const row = monthly.find((m) => new Date(m.month).getMonth() === d.getMonth() && new Date(m.month).getFullYear() === d.getFullYear());
      return { month: d.toISOString().slice(0, 7), total: row?.total ?? 0, jobs: row?.jobs ?? 0 };
    });

    return {
      business: { id: business.id, name: business.name, ratingAvg: business.ratingAvg, ratingCount: business.ratingCount, isVerified: business.isVerified },
      bookings: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      earnings: {
        allTime: Number(allTime._sum.amount ?? 0),
        thisMonth: Number(thisMonth._sum.amount ?? 0),
        monthly: months,
      },
      upcoming,
    };
  }

  // ─────────────── Helpers ───────────────

  async requireBusiness(ownerId: string) {
    const business = await this.prisma.business.findUnique({ where: { ownerId } });
    if (!business) throw new NotFoundException('Create your business profile first');
    return business;
  }

  private async ownService(ownerId: string, id: string) {
    const service = await this.prisma.service.findUnique({ where: { id }, include: { business: true } });
    if (!service) throw new NotFoundException('Service not found');
    if (service.business.ownerId !== ownerId) throw new ForbiddenException('This is not your service');
    return service;
  }

  private async requireCategory(id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, isActive: true } });
    if (!category) throw new BadRequestException('Unknown category');
  }
}
