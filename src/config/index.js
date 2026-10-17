import dotenv from 'dotenv';
import { parseDuration } from '../utils/duration.js';

// Carga las variables de entorno: primero las específicas del entorno
// (`.env.production`, `.env.test`, …) y después `.env` como base. La primera
// coincidencia gana y nunca se sobrescriben variables ya definidas en el
// sistema operativo.
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: [`.env.${env}`, '.env'], quiet: true });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBasePath = (value) => {
  const trimmed = String(value ?? '')
    .trim()
    .replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

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
  /** Prefijo público bajo el que se sirve la API (p. ej. `/td2026`). Vacío en la raíz. */
  basePath: toBasePath(process.env.BASE_PATH),
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
  pdf: {
    provider: (process.env.PDF_PROVIDER || 'wkhtmltopdf').toLowerCase(),
    wkhtmltopdfPath: process.env.WKHTMLTOPDF_PATH || 'wkhtmltopdf',
    gotenbergUrl: (process.env.GOTENBERG_URL || 'http://localhost:3000').replace(/\/$/, ''),
    timeoutMs: toNumber(process.env.PDF_TIMEOUT_MS, 30000),
  },
  certificates: {
    dir: process.env.CERTIFICATES_DIR || 'storage/certificates',
  },
};

export function validateConfig() {
  const missing = [];
  if (!process.env.DB_NAME) missing.push('DB_NAME');
  if (!process.env.DB_USER) missing.push('DB_USER');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  return missing;
}
