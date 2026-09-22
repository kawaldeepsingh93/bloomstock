import { computeLevels } from '@bloomstock/trading';
import { NotFoundError } from '@bloomstock/core';
import { jsonError, jsonOk } from '@/server/http';
import { getContainer } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';

export async function GET(request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  try {
    await enforceRateLimit(request.headers.get('x-forwarded-for') ?? 'anon');
    const { symbol } = await ctx.params;
    const ticker = symbol.toUpperCase();
    const { market } = getContainer();
    const [universe, snapshots, candles, news] = await Promise.all([
      market.listActiveUniverse(2000),
      market.latestIndicators([ticker]),
      market.getCandles(ticker, 'NSE', '1d', 250),
      market.recentNews(ticker, 10),
    ]);
    const instrument = universe.find((item) => item.symbol === ticker);
    if (!instrument) {
      throw new NotFoundError(ticker);
    }
    return jsonOk({
      instrument,
      snapshot: snapshots[0] ?? null,
      candles,
      news,
      levels: computeLevels(candles),
    });
  } catch (error) {
    return jsonError(error);
  }
}
