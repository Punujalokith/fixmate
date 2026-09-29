import { allowedActions, canTransition, isLateCancel } from './booking-state.js';

describe('booking state machine', () => {
  it('lets only the provider accept or reject a pending booking', () => {
    expect(canTransition('PENDING', 'ACCEPTED', 'PROVIDER')).toBe(true);
    expect(canTransition('PENDING', 'ACCEPTED', 'CUSTOMER')).toBe(false);
    expect(canTransition('PENDING', 'REJECTED', 'PROVIDER')).toBe(true);
    expect(canTransition('PENDING', 'REJECTED', 'ADMIN')).toBe(false);
  });

  it('only the system can expire a booking', () => {
    expect(canTransition('PENDING', 'EXPIRED', 'SYSTEM')).toBe(true);
    expect(canTransition('PENDING', 'EXPIRED', 'ADMIN')).toBe(false);
  });

  it('follows the happy path in order', () => {
    expect(canTransition('ACCEPTED', 'IN_PROGRESS', 'PROVIDER')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'COMPLETED', 'PROVIDER')).toBe(true);
    expect(canTransition('PENDING', 'COMPLETED', 'PROVIDER')).toBe(false); // can't skip steps
  });

  it('allows only admins to cancel a job in progress', () => {
    expect(canTransition('IN_PROGRESS', 'CANCELLED', 'ADMIN')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'CANCELLED', 'CUSTOMER')).toBe(false);
    expect(canTransition('IN_PROGRESS', 'CANCELLED', 'PROVIDER')).toBe(false);
  });

  it('final statuses cannot change', () => {
    for (const from of ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'] as const) {
      expect(allowedActions(from, 'ADMIN')).toEqual([]);
      expect(allowedActions(from, 'PROVIDER')).toEqual([]);
    }
  });

  it('lists the buttons each person should see', () => {
    expect(allowedActions('PENDING', 'CUSTOMER')).toEqual(['cancel']);
    expect(allowedActions('PENDING', 'PROVIDER')).toEqual(['accept', 'reject', 'cancel']);
    expect(allowedActions('ACCEPTED', 'PROVIDER')).toEqual(['start', 'cancel']);
    expect(allowedActions('IN_PROGRESS', 'PROVIDER')).toEqual(['complete']);
  });

  it('detects last-minute cancellations', () => {
    const now = new Date('2026-10-01T08:00:00Z');
    expect(isLateCancel(new Date('2026-10-01T09:00:00Z'), now, 2)).toBe(true);
    expect(isLateCancel(new Date('2026-10-01T11:00:00Z'), now, 2)).toBe(false);
  });
});
