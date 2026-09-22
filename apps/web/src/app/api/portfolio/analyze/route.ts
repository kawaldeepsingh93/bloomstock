import { ConfigurationError } from '@bloomstock/core';
import { parseBody } from '@bloomstock/shared';
import { analyzePortfolio } from '@bloomstock/trading';
import { jsonError, jsonOk } from '@/server/http';
import { requireTrader } from '@/server/auth';
import { getContainer, getOrchestrator } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';
import { holdingImportSchema } from '@/server/validation';

export async function POST(request: Request) {
  try {
    const { user } = await requireTrader();
    await enforceRateLimit(`ai:${user.id}`, 5);
    const body = parseBody(
      holdingImportSchema,
      await request.json().catch(() => ({ holdings: [] })),
    );
    const { portfolios, market, users, prompts } = getContainer();
    const portfolio = await portfolios.getPrimary(user.id);
    if (body.holdings.length > 0) {
      await portfolios.replaceHoldings(
        portfolio.id,
        body.holdings.map((holding) => ({
          symbol: holding.symbol,
          exchange: holding.exchange ?? 'NSE',
          quantity: holding.quantity,
          avgPrice: holding.avgPrice,
          investedAt: null,
        })),
      );
    }
    const latest = await portfolios.getPrimary(user.id);
    const snapshots = await market.latestIndicators(latest.holdings.map((h) => h.symbol));
    const analysis = analyzePortfolio(
      latest.id,
      latest.capital,
      latest.holdings,
      new Map(snapshots.map((item) => [item.symbol, item])),
    );
    let advice = analysis.advice;
    try {
      const orchestrator = await getOrchestrator();
      advice = await orchestrator.reviewPortfolio(
        analysis,
        await prompts.getActive('portfolio_review'),
      );
    } catch (error) {
      if (!(error instanceof ConfigurationError)) {
        throw error;
      }
    }
    await users.writeAudit(user.id, 'portfolio.analyze', latest.id, {
      names: latest.holdings.length,
    });
    return jsonOk({ ...analysis, advice });
  } catch (error) {
    return jsonError(error);
  }
}
