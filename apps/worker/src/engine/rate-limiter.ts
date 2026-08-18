import Redis from 'ioredis';
import { workerConfig } from '../config/redis.config';

let redisClient: Redis | null = null;
function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: workerConfig.redisHost,
      port: workerConfig.redisPort,
      password: workerConfig.redisPassword,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    redisClient.on('error', () => {
      // Suppress unhandled redis connection error in test mode
    });
  }
  return redisClient;
}

export class RateLimiter {
  static async checkRateLimit(connectorId: string, orgId: string, limit = 60, windowSeconds = 60): Promise<boolean> {
    const key = `ratelimit:${orgId}:${connectorId}`;
    try {
      const redis = getRedis();
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
      return current <= limit;
    } catch (e) {
      // Fallback to true if Redis connection is offline
      return true;
    }
  }
}
