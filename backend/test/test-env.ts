// Settings used only by the e2e tests (override .env).
export const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ?? 'postgresql://fixmate:fixmate_dev_password@localhost:5433/fixmate_test?schema=public';

export const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: TEST_DATABASE_URL,
  REDIS_URL: process.env['TEST_REDIS_URL'] ?? 'redis://localhost:6380/1', // separate Redis db from development
  JWT_ACCESS_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  ANTHROPIC_API_KEY: '', // always use the offline fallback in tests (no cost, deterministic)
  FIREBASE_SERVICE_ACCOUNT_PATH: '',
  UPLOAD_DIR: 'uploads-test',
  BOOKING_MIN_LEAD_MINUTES: '60',
};
