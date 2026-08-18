import Redis from 'ioredis';
import { workerConfig } from '../config/redis.config';

let redisClient: Redis | null = null;
function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: workerConfig.redisHost,
      port: workerConfig.redisPort,
      password: workerConfig.redisPassword,
    });
  }
  return redisClient;
}

export class RateLimiter {
  static async checkRateLimit(connectorId: string, orgId: string, limit = 60, windowSeconds = 60): Promise<boolean> {
    const key = `ratelimit:${orgId}:${connectorId}`;
    const redis = getRedis();

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
      return current <= limit;
    } catch (e) {
      console.error('[RateLimiter] Error checking rate limit in Redis:', e);
      return true; // Fallback allow if Redis check fails
    }
  }
}
