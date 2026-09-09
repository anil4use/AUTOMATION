import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../apps/backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const workerConfig = {
  redisUrl: process.env.REDIS_URL || undefined,
  redisHost: process.env.REDIS_HOST || 'redis-14365.c264.ap-south-1-1.ec2.cloud.redislabs.com',
  redisPort: parseInt(process.env.REDIS_PORT || '14365', 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/automation_platform',
  concurrency: 5,
};
