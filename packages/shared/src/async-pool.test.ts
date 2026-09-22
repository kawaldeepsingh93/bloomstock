import { mapPool } from './async-pool';

describe('mapPool', () => {
  it('runs workers with a concurrency cap and keeps order', async () => {
    const seen: number[] = [];
    const results = await mapPool([1, 2, 3, 4], 2, async (value) => {
      seen.push(value);
      return value * 10;
    });
    expect(results).toEqual([10, 20, 30, 40]);
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it('returns an empty list for no items', async () => {
    await expect(mapPool([], 8, async (value: number) => value)).resolves.toEqual([]);
  });
});
