import 'dotenv/config';
import { parseDuration } from '../utils/duration.js';

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const env = process.env.NODE_ENV || 'development';

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const jwtAccessTtl = process.env.JWT_ACCESS_TTL || '15m';
const jwtRefreshTtl = process.env.JWT_REFRESH_TTL || '7d';
const emailVerificationTtl = process.env.EMAIL_VERIFICATION_TTL || '24h';
const passwordResetTtl = process.env.PASSWORD_RESET_TTL || '1h';

export const config = {
  env,
  isProduction: env === 'production',
  isTest: env === 'test',
  port: toNumber(process.env.PORT, 3000),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:4321').replace(/\/$/, ''),
  cors: {
    origins: corsOrigins,
  },
  db: {
    dialect: process.env.DB_DIALECT || 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: toNumber(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'eventos',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    logging: toBoolean(process.env.DB_LOGGING, false),
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    accessTtl: jwtAccessTtl,
    accessTtlMs: parseDuration(jwtAccessTtl),
    refreshTtl: jwtRefreshTtl,
    refreshTtlMs: parseDuration(jwtRefreshTtl),
  },
  email: {
    host: process.env.SMTP_HOST || '',
    port: toNumber(process.env.SMTP_PORT, 587),
    secure: toBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.MAIL_FROM || 'Eventos <no-reply@localhost>',
    maxRetries: toNumber(process.env.MAIL_MAX_RETRIES, 2),
    retryDelayMs: toNumber(process.env.MAIL_RETRY_DELAY_MS, 500),
  },
  appName: process.env.APP_NAME || 'Tecnología Digital',
  tokens: {
    emailVerificationTtlMs: parseDuration(emailVerificationTtl),
    passwordResetTtlMs: parseDuration(passwordResetTtl),
  },
  events: {
    timezoneOffsetMinutes: toNumber(process.env.EVENT_TZ_OFFSET_MINUTES, 0),
  },
};

export function validateConfig() {
  const missing = [];
  if (!process.env.DB_NAME) missing.push('DB_NAME');
  if (!process.env.DB_USER) missing.push('DB_USER');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  return missing;
}
