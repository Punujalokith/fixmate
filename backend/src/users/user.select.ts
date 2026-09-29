import type { Prisma } from '../generated/prisma/client.js';

// Fields that are safe to send to the client (never the password hash).
export const publicUserSelect = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  avatarUrl: true,
  role: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// What other users may see about someone (e.g. the customer in a provider's booking).
export const contactUserSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  phone: true,
} satisfies Prisma.UserSelect;
