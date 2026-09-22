import type { Holding, PortfolioAdvice, PortfolioAnalysis } from '@bloomstock/core';
import { roundTo } from '@bloomstock/shared';
import type { IndicatorSnapshot } from '@bloomstock/core';

export function analyzePortfolio(
  portfolioId: string,
  capital: number,
  holdings: Holding[],
  snapshots: Map<string, IndicatorSnapshot>,
): PortfolioAnalysis {
  const allocation = holdings.map((holding) => {
    const lastPrice = holding.lastPrice ?? snapshots.get(holding.symbol)?.close ?? holding.avgPrice;
    const marketValue = lastPrice * holding.quantity;
    const invested = holding.avgPrice * holding.quantity;
    return {
      symbol: holding.symbol,
      weight: 0,
      marketValue: roundTo(marketValue, 2),
      unrealizedPnl: roundTo(marketValue - invested, 2),
      unrealizedPnlPercent:
        invested === 0 ? 0 : roundTo(((marketValue - invested) / invested) * 100, 2),
    };
  });
  const totalValue = allocation.reduce((sum, slice) => sum + slice.marketValue, 0) || capital;
  const invested = holdings.reduce((sum, h) => sum + h.avgPrice * h.quantity, 0);
  for (const slice of allocation) {
    slice.weight = roundTo((slice.marketValue / totalValue) * 100, 2);
  }

  const advice: PortfolioAdvice[] = holdings.map((holding) => {
    const snapshot = snapshots.get(holding.symbol);
    if (!snapshot) {
      return {
        symbol: holding.symbol,
        action: 'hold',
        trailingStop: null,
        rationale: 'No live snapshot yet',
      };
    }
    if (snapshot.close < snapshot.ema50) {
      return {
        symbol: holding.symbol,
        action: 'sell',
        trailingStop: snapshot.ema50,
        rationale: 'Price lost EMA50. Swing thesis is invalidated.',
      };
    }
    if (snapshot.close > snapshot.ema20) {
      return {
        symbol: holding.symbol,
        action: 'trail',
        trailingStop: roundTo(snapshot.close - snapshot.atr, 2),
        rationale: 'Trend intact. Trail the stop by 1 ATR under spot.',
      };
    }
    return {
      symbol: holding.symbol,
      action: 'hold',
      trailingStop: snapshot.ema20,
      rationale: 'Between EMA20 and EMA50. Hold and tighten risk.',
    };
  });

  const riskNotes: string[] = [];
  const overweight = allocation.find((slice) => slice.weight > 25);
  if (overweight) {
    riskNotes.push(
      `${overweight.symbol} is ${overweight.weight}% of the book. Cap single-name risk at 25%.`,
    );
  }
  if (holdings.length > 0 && holdings.length < 3) {
    riskNotes.push('Book is concentrated. Swing books usually hold 4-8 uncorrelated names.');
  }

  return {
    portfolioId,
    totalValue: roundTo(totalValue, 2),
    invested: roundTo(invested, 2),
    unrealizedPnl: roundTo(totalValue - invested, 2),
    allocation,
    riskNotes,
    advice,
  };
}
