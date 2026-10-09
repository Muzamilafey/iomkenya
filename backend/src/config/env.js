const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const int = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const env = {
  nodeEnv,
  isProduction,
  port: int(process.env.PORT, 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_assistance',
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    cookieName: process.env.JWT_COOKIE_NAME || 'hta_admin_token',
  },
  mpesa: {
    environment: process.env.MPESA_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    shortcode: process.env.MPESA_SHORTCODE || '',
    passkey: process.env.MPESA_PASSKEY || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || '',
    transactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: int(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '',
  },
  uploads: {
    dir: path.resolve(__dirname, '../..', process.env.UPLOAD_DIR || 'uploads'),
    maxFileSizeMb: int(process.env.MAX_FILE_SIZE_MB, 5),
  },
  rateLimit: {
    windowMinutes: int(process.env.RATE_LIMIT_WINDOW_MINUTES, 15),
    maxRequests: int(process.env.RATE_LIMIT_MAX_REQUESTS, 300),
  },
};

env.uploads.publicDir = path.join(env.uploads.dir, 'public');

if (!env.jwt.secret) {
  if (isProduction) {
    throw new Error('JWT_SECRET must be set in production');
  }
  env.jwt.secret = 'dev-only-insecure-jwt-secret';
  console.warn('[env] JWT_SECRET not set — using an insecure development secret');
}

env.mpesa.isConfigured = Boolean(
  env.mpesa.consumerKey &&
    env.mpesa.consumerSecret &&
    env.mpesa.shortcode &&
    env.mpesa.passkey &&
    env.mpesa.callbackUrl
);

env.smtp.isConfigured = Boolean(env.smtp.host && env.smtp.from);

module.exports = env;
