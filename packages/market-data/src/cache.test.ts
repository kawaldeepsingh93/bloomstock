import { MemoryCache, RedisCache } from './cache';

describe('MemoryCache', () => {
  it('returns values inside TTL and misses after expiry', async () => {
    jest.useFakeTimers();
    const cache = new MemoryCache();
    await cache.set('nifty', { lastPrice: 25000 }, 10);
    await expect(cache.get('nifty')).resolves.toEqual({ lastPrice: 25000 });
    jest.advanceTimersByTime(11_000);
    await expect(cache.get('nifty')).resolves.toBeNull();
    jest.useRealTimers();
  });
});

describe('RedisCache', () => {
  it('falls back to memory when Redis is unreachable', async () => {
    const cache = new RedisCache('redis://127.0.0.1:1');
    await cache.set('nifty', { lastPrice: 25000 }, 30);
    await expect(cache.get('nifty')).resolves.toEqual({ lastPrice: 25000 });
  });
});
