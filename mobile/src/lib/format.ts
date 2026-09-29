import type { BookingStatus, PriceType } from './types';
import { colors } from '@/theme';

export const money = (value: number | string) => `Rs. ${Number(value).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;

export const priceLabel = (price: string | number, type: PriceType) =>
  type === 'HOURLY' ? `${money(price)}/hr` : type === 'INSPECTION' ? `${money(price)} visit` : money(price);

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

export const dateOnly = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const timeAgo = (iso: string) => {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : dateOnly(iso);
};

/** 570 → "9:30 AM" */
export const minuteToTime = (minute: number) => {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const STATUS: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Waiting for provider', color: colors.warning, bg: colors.warningSoft },
  ACCEPTED: { label: 'Accepted', color: colors.info, bg: colors.infoSoft },
  IN_PROGRESS: { label: 'In progress', color: colors.primary, bg: colors.primarySoft },
  COMPLETED: { label: 'Completed', color: colors.success, bg: colors.successSoft },
  REJECTED: { label: 'Declined', color: colors.danger, bg: colors.dangerSoft },
  CANCELLED: { label: 'Cancelled', color: colors.textMuted, bg: colors.border },
  EXPIRED: { label: 'Expired', color: colors.textMuted, bg: colors.border },
};

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
