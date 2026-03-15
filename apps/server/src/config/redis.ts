import { Redis } from 'ioredis';
import fs from 'node:fs';
import { env } from './env.js';
import { logger } from '../lib/logger.js';

/**
 * Build a shared Redis connection.
 * Supports both plain redis:// and TLS rediss:// URLs.
 * Used by BullMQ queue + worker, and any future caching.
 */
function createRedisConnection(): Redis {
  const url = env.REDIS_URL;
  const isSecure = url.startsWith('rediss://');

  let tls: Record<string, unknown> | undefined;
  if (isSecure) {
    tls = {
      servername: new URL(url).hostname,
      rejectUnauthorized: env.NODE_ENV !== 'development',
    };
    if (env.REDIS_CA) {
      try {
        tls.ca = [fs.readFileSync(env.REDIS_CA, 'utf-8')];
      } catch (err) {
        logger.warn({ err, path: env.REDIS_CA }, 'Failed to load REDIS_CA');
      }
    }
  }

  const connection = new Redis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
    connectTimeout: 20_000,
    tls,
  });

  connection.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  connection.on('connect', () => {
    logger.info('Redis connected');
  });

  return connection;
}

/** Singleton Redis instance shared across the app */
export const redis = createRedisConnection();

/**
 * Gracefully quit Redis.
 */
export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis disconnected');
}
