import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`[Database] Connected to MongoDB Atlas at ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('[Database] Connection failure:', error);
    throw error;
  }
}
