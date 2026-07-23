/**
 * Configuration
 */
require('dotenv').config();

const config = {
  // App
  app: {
    name: process.env.APP_NAME || 'NEXORA CHQT',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
    host: process.env.HOST || '0.0.0.0',
    url: process.env.APP_URL || 'http://localhost:5000'
  },

  // Database (Supabase)
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },

  // SendGrid
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    from: process.env.EMAIL_FROM || 'no-reply@nexorachqt.com'
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
  },

  // Security
  security: {
    csrfSecret: process.env.CSRF_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  }
};

// Validate required config
const required = ['supabase.url', 'supabase.key', 'jwt.secret'];
for (const key of required) {
  const parts = key.split('.');
  let value = config;
  for (const part of parts) {
    value = value[part];
  }
  if (!value) {
    throw new Error(`Missing required configuration: ${key}`);
  }
}

module.exports = config;
