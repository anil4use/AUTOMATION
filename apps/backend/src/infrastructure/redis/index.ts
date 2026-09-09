import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

const commonRedisOptions = {
  keepAlive: 10000,
  connectTimeout: 10000,
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => Math.min(times * 200, 3000),
};

export function getRedisPublisher(): Redis {
  if (!redisPublisher) {
    redisPublisher = env.redisUrl
      ? new Redis(env.redisUrl, commonRedisOptions)
      : new Redis({
          host: env.redisHost,
          port: env.redisPort,
          password: env.redisPassword || undefined,
          ...commonRedisOptions,
        });
    redisPublisher.on('connect', () => logger.info('[Redis] Publisher connected'));
    redisPublisher.on('error', (err: any) => {
      if (err?.code === 'ECONNRESET' || err?.message?.includes('ECONNRESET')) return;
      logger.error('[Redis Publisher Error]:', err);
    });
  }
  return redisPublisher;
}

export function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    redisSubscriber = env.redisUrl
      ? new Redis(env.redisUrl, commonRedisOptions)
      : new Redis({
          host: env.redisHost,
          port: env.redisPort,
          password: env.redisPassword || undefined,
          ...commonRedisOptions,
        });
    redisSubscriber.on('connect', () => logger.info('[Redis] Subscriber connected'));
    redisSubscriber.on('error', (err: any) => {
      if (err?.code === 'ECONNRESET' || err?.message?.includes('ECONNRESET')) return;
      logger.error('[Redis Subscriber Error]:', err);
    });
  }
  return redisSubscriber;
}
