import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

export function getRedisPublisher(): Redis {
  if (!redisPublisher) {
    redisPublisher = env.redisUrl
      ? new Redis(env.redisUrl, { maxRetriesPerRequest: null })
      : new Redis({
          host: env.redisHost,
          port: env.redisPort,
          password: env.redisPassword || undefined,
          maxRetriesPerRequest: null,
        });
    redisPublisher.on('connect', () => logger.info('[Redis] Publisher connected'));
    redisPublisher.on('error', (err) => logger.error('[Redis Publisher Error]:', err));
  }
  return redisPublisher;
}

export function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    redisSubscriber = env.redisUrl
      ? new Redis(env.redisUrl, { maxRetriesPerRequest: null })
      : new Redis({
          host: env.redisHost,
          port: env.redisPort,
          password: env.redisPassword || undefined,
          maxRetriesPerRequest: null,
        });
    redisSubscriber.on('connect', () => logger.info('[Redis] Subscriber connected'));
    redisSubscriber.on('error', (err) => logger.error('[Redis Subscriber Error]:', err));
  }
  return redisSubscriber;
}
