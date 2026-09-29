// Shapes of the data the API returns. (Prisma Decimal values arrive as strings.)

export type Role = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type BookingAction = 'accept' | 'reject' | 'start' | 'complete' | 'cancel';
export type PriceType = 'FIXED' | 'HOURLY' | 'INSPECTION';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  business?: { id: string; name: string; isVerified: boolean } | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  _count?: { services: number };
}

export interface BusinessCard {
  id: string;
  name: string;
  city: string;
  district: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedJobs: number;
  startingPrice?: number | null;
  categories?: { name: string; slug: string }[];
}

export interface Service {
  id: string;
  businessId: string;
  categoryId: string;
  title: string;
  description: string | null;
  priceType: PriceType;
  price: string;
  durationMinutes: number;
  imageUrl: string | null;
  isActive: boolean;
  category: { id: string; name: string; slug: string; icon: string | null };
  business?: BusinessCard;
}

export interface Slot {
  id?: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export interface BusinessDetail extends BusinessCard {
  description: string | null;
  phone: string | null;
  addressLine: string | null;
  serviceRadiusKm: number;
  services: Service[];
  availability: Slot[];
  owner?: { fullName: string; avatarUrl: string | null; createdAt: string };
  isFavourite?: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  providerReply: string | null;
  createdAt: string;
  customer: { fullName: string; avatarUrl: string | null };
  booking?: { serviceTitle: string };
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  isDefault: boolean;
}

export interface Booking {
  id: string;
  code: string;
  status: BookingStatus;
  scheduledAt: string;
  serviceTitle: string;
  priceType: PriceType;
  price: string;
  addressLine: string;
  city: string;
  notes: string | null;
  cancelReason: string | null;
  createdAt: string;
  customerId: string;
  business: { id: string; name: string; ownerId: string; logoUrl: string | null; phone: string | null; city: string; ratingAvg: number };
  customer: { id: string; fullName: string; avatarUrl: string | null; phone: string | null };
  service: { id: string; durationMinutes: number; imageUrl: string | null; category: { name: string; slug: string; icon: string | null } };
  payment: { status: 'PENDING' | 'PAID' | 'REFUNDED'; amount: string; method: 'CASH' | 'CARD' } | null;
  review: { id: string; rating: number; comment: string | null; providerReply: string | null } | null;
  actions: BookingAction[];
  canReview: boolean;
  statusHistory?: { id: string; toStatus: BookingStatus; note: string | null; createdAt: string; changedBy: { fullName: string; role: Role } | null }[];
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender: { id: string; fullName: string; avatarUrl: string | null };
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string> | null;
  readAt: string | null;
  createdAt: string;
}

export interface AssistResult {
  source: 'ai' | 'fallback';
  category: { id: string; name: string; slug: string; icon: string | null } | null;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  summary: string;
  followUpQuestions: string[];
  safetyAdvice: string | null;
  bookingNote: string;
  providers: Service[];
}

export interface ProviderDashboard {
  business: { id: string; name: string; ratingAvg: number; ratingCount: number; isVerified: boolean };
  bookings: Partial<Record<BookingStatus, number>>;
  earnings: { allTime: number; thisMonth: number; monthly: { month: string; total: number; jobs: number }[] };
  upcoming: (Omit<Booking, 'actions' | 'canReview' | 'business' | 'service' | 'payment' | 'review'> & { customer: { fullName: string; avatarUrl: string | null } })[];
}
