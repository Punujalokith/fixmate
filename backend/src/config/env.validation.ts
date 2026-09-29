import Joi from 'joi';

// The app refuses to start if a required setting is missing or wrong.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  PUBLIC_BASE_URL: Joi.string().uri().default('http://localhost:3000'),
  CORS_ORIGINS: Joi.string().default('*'),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),

  // Auth
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).default(900), // 15 min
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).default(30),

  // Bookings
  BOOKING_ACCEPT_TIMEOUT_MINUTES: Joi.number().integer().min(1).default(30),
  BOOKING_MIN_LEAD_MINUTES: Joi.number().integer().min(0).default(60),
  BOOKING_LATE_CANCEL_HOURS: Joi.number().integer().min(0).default(2),
  BUSINESS_TIMEZONE: Joi.string().default('Asia/Colombo'),

  // Files
  UPLOAD_DIR: Joi.string().default('uploads'),
  MAX_UPLOAD_MB: Joi.number().min(1).max(50).default(5),

  // Optional integrations: features fall back gracefully when these are empty.
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  ANTHROPIC_MODEL: Joi.string().default('claude-haiku-4-5'),
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().allow('').optional(),

  // Rate limiting (requests per minute)
  RATE_LIMIT_PER_MINUTE: Joi.number().integer().min(1).default(120),
  AUTH_RATE_LIMIT_PER_MINUTE: Joi.number().integer().min(1).default(10),
});
