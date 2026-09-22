import Redis from 'ioredis';
import { envValue } from '@bloomstock/core';

export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

export class MemoryCache implements CacheClient {
  private readonly store = new Map<string, { expires: number; value: unknown }>();

  async get<T>(key: string): Promise<T | null> {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return null;
    }
    return hit.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
}

export class RedisCache implements CacheClient {
  private redis: Redis | null;
  private readonly memory = new MemoryCache();

  constructor(redisUrl = envValue('REDIS_URL')) {
    this.redis = redisUrl
      ? new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
          retryStrategy: () => null,
        })
      : null;
    this.redis?.on('error', () => this.disable());
  }

  private disable() {
    const client = this.redis;
    if (!client) return;
    this.redis = null;
    client.removeAllListeners();
    void client.quit().catch(() => client.disconnect());
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return this.memory.get(key);
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      this.disable();
      return this.memory.get(key);
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.redis) {
      await this.memory.set(key, value, ttlSeconds);
      return;
    }
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      this.disable();
      await this.memory.set(key, value, ttlSeconds);
    }
  }
}

export function createCache(): CacheClient {
  return envValue('REDIS_URL') ? new RedisCache() : new MemoryCache();
}
