import { NotFoundError } from '@bloomstock/core';
import { bestPattern, scoreTechnical } from '@bloomstock/trading';
import { jsonError, jsonOk } from '@/server/http';
import { requireTrader } from '@/server/auth';
import { getContainer, getOrchestrator } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';

export async function POST(_request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  try {
    const { user } = await requireTrader();
    await enforceRateLimit(`ai:${user.id}`, 5);
    const { symbol } = await ctx.params;
    const ticker = symbol.toUpperCase();
    const { market, prompts, users } = getContainer();
    const [universe, snapshots, candles, news] = await Promise.all([
      market.listActiveUniverse(2000),
      market.latestIndicators([ticker]),
      market.getCandles(ticker, 'NSE', '1d', 250),
      market.recentNews(ticker, 20),
    ]);
    const instrument = universe.find((item) => item.symbol === ticker);
    const snapshot = snapshots[0];
    if (!instrument || !snapshot) {
      throw new NotFoundError(ticker);
    }
    const pattern = bestPattern(candles);
    const score = scoreTechnical(snapshot, pattern);
    const orchestrator = await getOrchestrator();
    const brief = await orchestrator.research(
      {
        symbol: instrument.symbol,
        exchange: instrument.exchange,
        name: instrument.name,
        setupType: pattern?.type ?? null,
        score,
        risk: null,
        confidence: score.total,
        verdict: score.rejects.length > 0 ? 'no_trade' : 'trade',
        rejectedReason: score.rejects[0] ?? null,
      },
      news,
      await prompts.getActive('stock_deep_research'),
    );
    await users.writeAudit(user.id, 'stock.research', ticker, { thesis: brief.thesis });
    return jsonOk(brief);
  } catch (error) {
    return jsonError(error);
  }
}
