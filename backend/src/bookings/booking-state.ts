import type { BookingStatus, Role } from '../generated/prisma/client.js';

/**
 * The booking "state machine": which status can move to which, and who may do it.
 *
 *   PENDING ──accept──▶ ACCEPTED ──start──▶ IN_PROGRESS ──complete──▶ COMPLETED
 *      │ reject/expire      │                    │
 *      ▼                    ▼ cancel             ▼ cancel (admin only)
 *   REJECTED / EXPIRED   CANCELLED            CANCELLED
 */
export type Actor = Role | 'SYSTEM';
export type BookingAction = 'accept' | 'reject' | 'start' | 'complete' | 'cancel' | 'expire';

export const ACTION_TARGET: Record<BookingAction, BookingStatus> = {
  accept: 'ACCEPTED',
  reject: 'REJECTED',
  start: 'IN_PROGRESS',
  complete: 'COMPLETED',
  cancel: 'CANCELLED',
  expire: 'EXPIRED',
};

const TRANSITIONS: Partial<Record<BookingStatus, Partial<Record<BookingStatus, Actor[]>>>> = {
  PENDING: {
    ACCEPTED: ['PROVIDER'],
    REJECTED: ['PROVIDER'],
    CANCELLED: ['CUSTOMER', 'PROVIDER', 'ADMIN'],
    EXPIRED: ['SYSTEM'],
  },
  ACCEPTED: {
    IN_PROGRESS: ['PROVIDER'],
    CANCELLED: ['CUSTOMER', 'PROVIDER', 'ADMIN'],
  },
  IN_PROGRESS: {
    COMPLETED: ['PROVIDER'],
    CANCELLED: ['ADMIN'],
  },
};

export const ACTIVE_STATUSES: BookingStatus[] = ['PENDING', 'ACCEPTED', 'IN_PROGRESS'];
export const FINAL_STATUSES: BookingStatus[] = ['REJECTED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];

export function canTransition(from: BookingStatus, to: BookingStatus, actor: Actor): boolean {
  return TRANSITIONS[from]?.[to]?.includes(actor) ?? false;
}

/** Actions this actor may take right now — the app uses this to show the right buttons. */
export function allowedActions(from: BookingStatus, actor: Actor): BookingAction[] {
  return (Object.keys(ACTION_TARGET) as BookingAction[]).filter(
    (action) => action !== 'expire' && canTransition(from, ACTION_TARGET[action], actor),
  );
}

/** Customers can't cancel an accepted job at the last minute (provider may already be on the way). */
export function isLateCancel(scheduledAt: Date, now: Date, lateCancelHours: number): boolean {
  return scheduledAt.getTime() - now.getTime() < lateCancelHours * 60 * 60 * 1000;
}
