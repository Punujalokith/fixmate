import { fitsAvailability, localDayAndMinute, validateSlots } from './availability.js';

const TZ = 'Asia/Colombo'; // UTC+5:30, no daylight saving
const monToFri9to5 = [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startMinute: 540, endMinute: 1020 }));

describe('availability', () => {
  it('converts UTC to Sri Lanka local day and minute', () => {
    // 2026-10-05 is a Monday. 04:30 UTC = 10:00 in Colombo.
    expect(localDayAndMinute(new Date('2026-10-05T04:30:00Z'), TZ)).toEqual({ dayOfWeek: 1, minute: 600 });
    // 20:00 UTC Sunday = 01:30 Monday in Colombo (crosses midnight).
    expect(localDayAndMinute(new Date('2026-10-04T20:00:00Z'), TZ)).toEqual({ dayOfWeek: 1, minute: 90 });
  });

  it('accepts a job fully inside working hours', () => {
    expect(fitsAvailability(monToFri9to5, new Date('2026-10-05T04:30:00Z'), 60, TZ)).toBe(true);
  });

  it('rejects a job that runs past closing time', () => {
    // 16:30 local + 60 min = 17:30 > 17:00
    expect(fitsAvailability(monToFri9to5, new Date('2026-10-05T11:00:00Z'), 60, TZ)).toBe(false);
  });

  it('rejects days off', () => {
    // Sunday 10:00 local
    expect(fitsAvailability(monToFri9to5, new Date('2026-10-04T04:30:00Z'), 60, TZ)).toBe(false);
  });

  it('treats a business with no hours as always available', () => {
    expect(fitsAvailability([], new Date('2026-10-04T20:00:00Z'), 60, TZ)).toBe(true);
  });

  it('validates slots', () => {
    expect(validateSlots(monToFri9to5)).toBeNull();
    expect(validateSlots([{ dayOfWeek: 1, startMinute: 600, endMinute: 600 }])).toMatch(/end after/);
    expect(
      validateSlots([
        { dayOfWeek: 2, startMinute: 540, endMinute: 720 },
        { dayOfWeek: 2, startMinute: 700, endMinute: 900 },
      ]),
    ).toMatch(/overlap/);
    // Same times on different days is fine
    expect(
      validateSlots([
        { dayOfWeek: 2, startMinute: 540, endMinute: 720 },
        { dayOfWeek: 3, startMinute: 540, endMinute: 720 },
      ]),
    ).toBeNull();
  });
});
