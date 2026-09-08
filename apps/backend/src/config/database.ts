import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });
    const isAtlas = env.mongoUri.includes('mongodb+srv') || env.mongoUri.includes('.mongodb.net');
    const dbLabel = isAtlas ? 'MongoDB Atlas Cloud' : 'Local MongoDB';
    logger.info(`[Database] Connected to ${dbLabel} at ${conn.connection.host}:${conn.connection.port || 27017} (${conn.connection.name})`);
    return conn;
  } catch (error) {
    logger.error('[Database] Connection failure:', error);
    throw error;
  }
}
