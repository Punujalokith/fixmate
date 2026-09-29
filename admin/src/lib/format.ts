import type { BookingStatus } from './types';

export const money = (v: number | string) => `Rs. ${Number(v).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
export const num = (v: number) => v.toLocaleString('en-LK');
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
export const dateOnly = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  ACCEPTED: { label: 'Accepted', tone: 'blue' },
  IN_PROGRESS: { label: 'In progress', tone: 'teal' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  REJECTED: { label: 'Declined', tone: 'red' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
  EXPIRED: { label: 'Expired', tone: 'slate' },
};

export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'teal' | 'slate' | 'violet';
