export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  const step = Math.max(size, 1);
  for (let i = 0; i < items.length; i += step) {
    out.push(items.slice(i, i + step));
  }
  return out;
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await worker(item, index);
    }
  }
  const runners = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: runners }, () => run()));
  return results;
}
