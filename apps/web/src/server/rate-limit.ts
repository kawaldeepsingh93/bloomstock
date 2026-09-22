import Redis from 'ioredis';
import { RateLimitError, envValue } from '@bloomstock/core';

const buckets = new Map<string, { count: number; resetAt: number }>();
let redis: Redis | null | undefined;

function disableRedis(client?: Redis | null) {
  if (client) {
    client.removeAllListeners();
    void client.quit().catch(() => client.disconnect());
  }
  redis = null;
}

function redisClient(): Redis | null {
  const url = envValue('REDIS_URL');
  if (!url || redis === null) return null;
  if (!redis) {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    client.on('error', () => {
      disableRedis(client);
    });
    redis = client;
  }
  return redis;
}

export async function enforceRateLimit(
  key: string,
  max = Number(process.env.RATE_LIMIT_MAX ?? 60),
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
): Promise<void> {
  const client = redisClient();
  if (client) {
    try {
      const redisKey = `rl:${key}`;
      const count = await client.incr(redisKey);
      if (count === 1) {
        await client.pexpire(redisKey, windowMs);
      }
      if (count > max) {
        throw new RateLimitError();
      }
      return;
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      disableRedis(client);
    }
  }
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > max) {
    throw new RateLimitError();
  }
}
