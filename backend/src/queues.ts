// Names of the background job queues (stored in Redis by BullMQ).
export const QUEUES = {
  PUSH: 'push-notifications',
  BOOKING_TIMERS: 'booking-timers',
} as const;

/** BullMQ wants host/port options, so turn "redis://user:pass@host:port/db" into them. */
export function redisConnectionFromUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
