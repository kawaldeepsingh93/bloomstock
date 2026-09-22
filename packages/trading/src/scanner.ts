import type {
  Candle,
  IndicatorSnapshot,
  Instrument,
  MarketRegime,
  ScanFilters,
  SwingCandidate,
  SwingRules,
} from '@bloomstock/core';
import { DEFAULT_SWING_RULES } from '@bloomstock/core';
import { clamp, roundTo } from '@bloomstock/shared';
import { bestPattern } from './patterns';
import { isHardReject, scoreTechnical } from './scoring';
import { applySwingDiscipline } from './extension';

export interface ScanableStock {
  instrument: Instrument;
  snapshot: IndicatorSnapshot;
  candles: Candle[];
}

export interface ScanInput {
  stocks: ScanableStock[];
  regime: MarketRegime;
  capital: number;
  riskPercent: number;
  filters?: ScanFilters;
  rules?: SwingRules;
  limit?: number;
}

export function scanSwingCandidates(input: ScanInput): SwingCandidate[] {
  if (input.regime === 'bearish') {
    return [];
  }

  const rules = input.rules ?? DEFAULT_SWING_RULES;
  const limit = input.limit ?? 3;
  const candidates: SwingCandidate[] = [];

  for (const stock of input.stocks) {
    const pattern = bestPattern(stock.candles);
    if (!passesFilters(stock, input.filters, pattern?.type ?? null)) {
      continue;
    }
    const score = scoreTechnical(stock.snapshot, pattern, rules);
    const rejected = isHardReject(score) || !pattern;
    if (rejected) {
      candidates.push(
        toCandidate(
          stock,
          pattern?.type ?? null,
          score,
          null,
          true,
          score.rejects[0] ?? 'Setup failed swing rules',
        ),
      );
      continue;
    }

    const shell = toCandidate(stock, pattern?.type ?? null, score, null, false, null);
    candidates.push(
      applySwingDiscipline(shell, stock.candles, stock.snapshot, input.capital, input.riskPercent),
    );
  }

  return candidates
    .filter((c) => !c.rejectedReason)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

export function noTradeReason(regime: MarketRegime, candidates: SwingCandidate[]): string | null {
  if (regime === 'bearish') {
    return 'Market regime is bearish. No swing longs today.';
  }
  if (candidates.length === 0) {
    return 'No Trade Today. No stock cleared trend, momentum, volume, and structure filters.';
  }
  return null;
}

export function passesSnapshotFilters(
  instrument: Instrument,
  snapshot: IndicatorSnapshot,
  filters?: ScanFilters,
): boolean {
  if (!filters) return true;
  if (filters.marketCapMin && (instrument.marketCap ?? 0) < filters.marketCapMin) return false;
  if (filters.marketCapMax && (instrument.marketCap ?? Infinity) > filters.marketCapMax)
    return false;
  if (
    filters.sectors?.length &&
    (!instrument.sector || !filters.sectors.includes(instrument.sector))
  ) {
    return false;
  }
  if (filters.rsiMin !== undefined && snapshot.rsi < filters.rsiMin) return false;
  if (filters.rsiMax !== undefined && snapshot.rsi > filters.rsiMax) return false;
  if (filters.aboveEma20 && snapshot.close <= snapshot.ema20) return false;
  if (filters.aboveEma50 && snapshot.close <= snapshot.ema50) return false;
  if (filters.volumeRatioMin && snapshot.volumeRatio < filters.volumeRatioMin) return false;
  return true;
}

function passesFilters(
  stock: ScanableStock,
  filters?: ScanFilters,
  setupType: SwingCandidate['setupType'] = null,
): boolean {
  if (!passesSnapshotFilters(stock.instrument, stock.snapshot, filters)) return false;
  if (filters?.pattern && setupType !== filters.pattern) return false;
  if (filters?.breakoutOnly && setupType !== 'breakout') return false;
  return true;
}

function toCandidate(
  stock: ScanableStock,
  setupType: SwingCandidate['setupType'],
  score: SwingCandidate['score'],
  risk: SwingCandidate['risk'],
  rejected: boolean,
  rejectedReason: string | null,
  liveVerdict: Exclude<SwingCandidate['verdict'], 'no_trade'> = 'trade',
): SwingCandidate {
  return {
    symbol: stock.instrument.symbol,
    exchange: stock.instrument.exchange,
    name: stock.instrument.name,
    setupType,
    score,
    risk,
    confidence: clamp(roundTo(score.total, 0), 0, 100),
    verdict: rejected ? 'no_trade' : liveVerdict,
    rejectedReason,
  };
}
