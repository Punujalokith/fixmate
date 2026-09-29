import type { Prisma } from '../generated/prisma/client.js';

// Shared "shapes" so every endpoint returns businesses/services the same way.

export const businessCardSelect = {
  id: true,
  name: true,
  city: true,
  district: true,
  logoUrl: true,
  coverUrl: true,
  isVerified: true,
  ratingAvg: true,
  ratingCount: true,
  completedJobs: true,
} satisfies Prisma.BusinessSelect;

export const serviceCardInclude = {
  category: { select: { id: true, name: true, slug: true, icon: true } },
  business: { select: businessCardSelect },
} satisfies Prisma.ServiceInclude;
