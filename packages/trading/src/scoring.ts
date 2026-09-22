import type { IndicatorSnapshot, PatternMatch, SwingRules, TechnicalScore } from '@bloomstock/core';
import { DEFAULT_SWING_RULES } from '@bloomstock/core';
import { clamp, roundTo } from '@bloomstock/shared';

export function scoreTechnical(
  snapshot: IndicatorSnapshot,
  pattern: PatternMatch | null,
  rules: SwingRules = DEFAULT_SWING_RULES,
): TechnicalScore {
  const reasons: string[] = [];
  const rejects: string[] = [];

  const trend = scoreTrend(snapshot, rules, reasons, rejects);
  const momentum = scoreMomentum(snapshot, rules, reasons, rejects);
  const volume = scoreVolume(snapshot, rules, reasons, rejects);
  const structure = scoreStructure(pattern, reasons, rejects);

  const total = roundTo(trend * 0.3 + momentum * 0.25 + volume * 0.2 + structure * 0.25, 2);

  return { trend, momentum, volume, structure, total, reasons, rejects };
}

function scoreTrend(
  snapshot: IndicatorSnapshot,
  rules: SwingRules,
  reasons: string[],
  rejects: string[],
): number {
  let score = 0;
  if (snapshot.close > snapshot.ema20) {
    score += 40;
    reasons.push('Price is above EMA20');
  } else if (rules.requireAboveEma20) {
    rejects.push('Price is below EMA20');
  }
  if (snapshot.close > snapshot.ema50) {
    score += 35;
    reasons.push('Price is above EMA50');
  } else if (rules.requireAboveEma50) {
    rejects.push('Price is below EMA50');
  }
  if (snapshot.ema20 > snapshot.ema50 && snapshot.ema50 > snapshot.ema200) {
    score += 25;
    reasons.push('EMA20 > EMA50 > EMA200 stack is aligned');
  }
  return clamp(score, 0, 100);
}

function scoreMomentum(
  snapshot: IndicatorSnapshot,
  rules: SwingRules,
  reasons: string[],
  rejects: string[],
): number {
  let score = 0;
  if (snapshot.rsi >= rules.minRsi && snapshot.rsi <= rules.maxRsi) {
    if (snapshot.rsi >= 65) {
      score += 35;
      reasons.push(`RSI ${snapshot.rsi} is elevated; prefer a dip over chasing the close`);
    } else {
      score += 60;
      reasons.push(`RSI ${snapshot.rsi} is in the 55-70 momentum pocket`);
    }
  } else if (snapshot.rsi > rules.maxRsi) {
    rejects.push(`RSI ${snapshot.rsi} is overbought for a swing entry`);
  } else {
    rejects.push(`RSI ${snapshot.rsi} lacks momentum`);
  }
  const macdBullish = snapshot.macd > snapshot.macdSignal && snapshot.macdHistogram > 0;
  if (macdBullish) {
    score += 40;
    reasons.push('MACD is bullish with a positive histogram');
  } else if (rules.requireMacdBullish) {
    rejects.push('MACD is not bullish');
  }
  return clamp(score, 0, 100);
}

function scoreVolume(
  snapshot: IndicatorSnapshot,
  rules: SwingRules,
  reasons: string[],
  rejects: string[],
): number {
  if (snapshot.volumeRatio >= rules.minVolumeRatio) {
    reasons.push(`Volume is ${snapshot.volumeRatio}x the 20-day average`);
    return clamp(60 + (snapshot.volumeRatio - rules.minVolumeRatio) * 20, 0, 100);
  }
  rejects.push(`Volume ratio ${snapshot.volumeRatio} is below ${rules.minVolumeRatio}x`);
  return clamp(snapshot.volumeRatio * 30, 0, 49);
}

function scoreStructure(
  pattern: PatternMatch | null,
  reasons: string[],
  rejects: string[],
): number {
  if (!pattern) {
    rejects.push('No recognized continuation or breakout structure');
    return 20;
  }
  reasons.push(`${pattern.type.replace('_', ' ')} structure detected`);
  return pattern.quality;
}

export function isHardReject(score: TechnicalScore): boolean {
  return score.rejects.length > 0 || score.total < 70;
}
