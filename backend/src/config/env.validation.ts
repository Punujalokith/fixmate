import Joi from 'joi';

// The app refuses to start if a required setting is missing or wrong.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  // Public address of this API (used in uploaded-file links). On Render, RENDER_EXTERNAL_URL is set automatically.
  PUBLIC_BASE_URL: Joi.string().uri().default(process.env['RENDER_EXTERNAL_URL'] ?? 'http://localhost:3000'),
  CORS_ORIGINS: Joi.string().default('*'),
  // Swagger docs at /api/docs. Always on in development; set true to keep them in production.
  ENABLE_SWAGGER: Joi.boolean().default(false),
  // Number of proxies in front of the API (Render/Heroku-style hosts = 1). Needed for correct client IPs.
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).default(0),

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
  ANTHROPIC_MODEL: Joi.string().default('claude-opus-5-5'),
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().allow('').optional(),

  // Rate limiting (requests per minute)
  RATE_LIMIT_PER_MINUTE: Joi.number().integer().min(1).default(120),
  AUTH_RATE_LIMIT_PER_MINUTE: Joi.number().integer().min(1).default(10),
});
