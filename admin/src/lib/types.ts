export type Role = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface User {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt?: string | null;
  business?: { id: string; name: string; isVerified: boolean } | null;
  _count?: { bookings: number };
}

export interface Stats {
  users: Partial<Record<Role, number>>;
  businesses: { total: number; verified: number };
  bookings: { total: number; byStatus: Partial<Record<BookingStatus, number>>; completionRate: number; daily: { day: string; bookings: number; completed: number }[] };
  revenue: { allTime: number; last30Days: number };
  topCategories: { name: string; slug: string; bookings: number }[];
  ai: AiSummary;
}

export interface AiSummary {
  requests30d: number;
  inputTokens30d: number;
  outputTokens30d: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface AdminBusiness {
  id: string;
  name: string;
  city: string;
  isVerified: boolean;
  isActive: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedJobs: number;
  createdAt: string;
  owner: { id: string; fullName: string; email: string; phone: string | null; status: string };
  _count: { services: number; bookings: number };
}

export interface AdminBooking {
  id: string;
  code: string;
  status: BookingStatus;
  scheduledAt: string;
  createdAt: string;
  serviceTitle: string;
  price: string;
  city: string;
  customer: { id: string; fullName: string; email: string };
  business: { id: string; name: string };
  payment: { status: string; amount: string; method: string } | null;
}

export interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  providerReply: string | null;
  isHidden: boolean;
  createdAt: string;
  customer: { fullName: string; email: string };
  business: { id: string; name: string };
  booking: { code: string; serviceTitle: string };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { services: number };
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: { fullName: string; email: string; role: Role } | null;
}

export interface AiUsage extends AiSummary {
  daily: { day: string; requests: number; tokens: number }[];
  recent: {
    id: string;
    input: string;
    output: { category_slug?: string; urgency?: string } | null;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorMessage: string | null;
    createdAt: string;
    user: { fullName: string; email: string };
  }[];
}
