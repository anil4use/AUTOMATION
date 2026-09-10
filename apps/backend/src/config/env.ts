import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

/** Throw at startup if a critical env var is missing in production */
function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value && isProduction) {
    throw new Error(
      `[ENV] Missing required environment variable: ${key}. ` +
      `Set it in your .env file. See apps/backend/.env.example for reference.`
    );
  }
  return value || '';
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:5000/api',

  // JWT — required in production
  jwtSecret: requireEnv('JWT_SECRET', isProduction ? undefined : 'dev_secret_jwt_key_CHANGE_IN_PROD_123'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // AES-256 Encryption — required in production (must be 32 chars)
  tokenEncryptionKey: requireEnv(
    'TOKEN_ENCRYPTION_KEY',
    isProduction ? undefined : '0123456789abcdef0123456789abcdef'
  ),

  // MongoDB
  mongoUri: requireEnv('MONGODB_URI', 'mongodb://localhost:27017/automation_platform'),

  // Redis / BullMQ
  redisUrl: process.env.REDIS_URL || undefined,
  redisHost: process.env.REDIS_HOST || 'redis-14365.c264.ap-south-1-1.ec2.cloud.redislabs.com',
  redisPort: parseInt(process.env.REDIS_PORT || '14365', 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,

  // AI Providers
  groqApiKey: process.env.GROQ_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  defaultLlmProvider: process.env.DEFAULT_LLM_PROVIDER || 'groq',

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // WhatsApp Agent (optional — only needed if using WA Agent Automation)
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v19.0',
};
