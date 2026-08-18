import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_jwt_key_123',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/automation_platform',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  ai: {
    groqApiKey: process.env.GROQ_API_KEY || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    defaultProvider: process.env.DEFAULT_LLM_PROVIDER || 'groq',
  },
};
