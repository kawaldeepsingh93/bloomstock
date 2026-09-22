import { jsonError, jsonOk } from '@/server/http';
import { getContainer } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';

export async function GET(request: Request) {
  try {
    await enforceRateLimit(request.headers.get('x-forwarded-for') ?? 'anon');
    const { market } = getContainer();
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toUpperCase();
    const universe = await market.listActiveUniverse(2000);
    const stocks = q
      ? universe.filter((item) => item.symbol.includes(q) || item.name.toUpperCase().includes(q))
      : universe;
    return jsonOk(stocks.slice(0, 100));
  } catch (error) {
    return jsonError(error);
  }
}
