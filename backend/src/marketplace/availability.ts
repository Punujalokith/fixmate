// Helpers for weekly working hours. Pure functions, so they are easy to unit test.

export interface Slot {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

/** Returns an error message if slots are invalid (end before start, or overlapping), else null. */
export function validateSlots(slots: Slot[]): string | null {
  for (const slot of slots) {
    if (slot.endMinute <= slot.startMinute) {
      return `Slot on day ${slot.dayOfWeek} must end after it starts`;
    }
  }
  const byDay = new Map<number, Slot[]>();
  for (const slot of slots) byDay.set(slot.dayOfWeek, [...(byDay.get(slot.dayOfWeek) ?? []), slot]);

  for (const [day, daySlots] of byDay) {
    const sorted = [...daySlots].sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startMinute < sorted[i - 1].endMinute) return `Slots overlap on day ${day}`;
    }
  }
  return null;
}

/** Day of week (0-6) and minutes-from-midnight of `date` in the given IANA timezone. */
export function localDayAndMinute(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    dayOfWeek: days.indexOf(get('weekday')),
    minute: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/**
 * True if a job from `start` lasting `durationMinutes` fits inside one working slot.
 * A business with no slots configured is treated as "available any time".
 */
export function fitsAvailability(slots: Slot[], start: Date, durationMinutes: number, timeZone: string): boolean {
  if (slots.length === 0) return true;
  const { dayOfWeek, minute } = localDayAndMinute(start, timeZone);
  const end = minute + durationMinutes;
  return slots.some((s) => s.dayOfWeek === dayOfWeek && minute >= s.startMinute && end <= s.endMinute);
}
