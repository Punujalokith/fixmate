import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/redis.module.js';

export const CATEGORIES_CACHE_KEY = 'categories:active';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // Categories rarely change and are loaded on every app start, so cache them for 10 minutes.
  findAll() {
    return this.cache.getOrSet(CATEGORIES_CACHE_KEY, 600, () =>
      this.prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { services: { where: { isActive: true } } } } },
      }),
    );
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category || !category.isActive) {
      throw new NotFoundException(`Category "${slug}" not found`);
    }
    return category;
  }
}
