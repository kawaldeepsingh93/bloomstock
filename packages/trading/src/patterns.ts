import type { Candle, PatternMatch, SetupType } from '@bloomstock/core';

const LOOKBACK = 20;

export function detectPatterns(candles: Candle[]): PatternMatch[] {
  const ordered = [...candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  if (ordered.length < LOOKBACK + 5) {
    return [];
  }

  const matches: PatternMatch[] = [];
  const breakout = detectBreakout(ordered);
  if (breakout) matches.push(breakout);
  const flag = detectFlag(ordered);
  if (flag) matches.push(flag);
  const triangle = detectAscendingTriangle(ordered);
  if (triangle) matches.push(triangle);
  const cup = detectCupHandle(ordered);
  if (cup) matches.push(cup);
  return matches.sort((a, b) => b.quality - a.quality);
}

export function bestPattern(candles: Candle[]): PatternMatch | null {
  return detectPatterns(candles)[0] ?? null;
}

function detectBreakout(candles: Candle[]): PatternMatch | null {
  const last = candles[candles.length - 1];
  const window = candles.slice(-LOOKBACK - 1, -1);
  if (!last || window.length < LOOKBACK) {
    return null;
  }
  const resistance = Math.max(...window.map((c) => c.high));
  const avgVolume = average(window.map((c) => c.volume));
  if (last.close > resistance && last.volume >= avgVolume * 1.5) {
    return {
      type: 'breakout',
      quality: 80,
      notes: [`Close ${last.close.toFixed(2)} broke ${LOOKBACK}d high ${resistance.toFixed(2)}`],
    };
  }
  return null;
}

function detectFlag(candles: Candle[]): PatternMatch | null {
  const impulse = candles.slice(-LOOKBACK, -8);
  const flag = candles.slice(-8);
  if (impulse.length < 8 || flag.length < 8) {
    return null;
  }
  const impulseReturn = (lastClose(impulse) - firstOpen(impulse)) / firstOpen(impulse);
  const flagRange = (maxHigh(flag) - minLow(flag)) / lastClose(impulse);
  const flagDrift = (lastClose(flag) - firstOpen(flag)) / firstOpen(flag);
  if (impulseReturn > 0.08 && flagRange < 0.06 && flagDrift < 0.02 && flagDrift > -0.05) {
    return {
      type: 'flag',
      quality: 72,
      notes: ['Bull flag: sharp impulse followed by tight, slightly downward consolidation'],
    };
  }
  return null;
}

function detectAscendingTriangle(candles: Candle[]): PatternMatch | null {
  const window = candles.slice(-LOOKBACK);
  const highs = window.map((c) => c.high);
  const lows = window.map((c) => c.low);
  const resistance = Math.max(...highs);
  const nearResistance = highs.filter((h) => (resistance - h) / resistance < 0.012).length;
  const risingLows =
    lows[0] !== undefined && lows[lows.length - 1] !== undefined
      ? lows[lows.length - 1]! > lows[0]! * 1.02
      : false;
  if (nearResistance >= 3 && risingLows) {
    return {
      type: 'ascending_triangle',
      quality: 70,
      notes: ['Ascending triangle: higher lows against a flat resistance'],
    };
  }
  return null;
}

function detectCupHandle(candles: Candle[]): PatternMatch | null {
  const window = candles.slice(-60);
  if (window.length < 40) {
    return null;
  }
  const cup = window.slice(0, -10);
  const handle = window.slice(-10);
  const left = cup.slice(0, Math.floor(cup.length / 3));
  const bottom = cup.slice(Math.floor(cup.length / 3), Math.floor((cup.length * 2) / 3));
  const right = cup.slice(Math.floor((cup.length * 2) / 3));
  const leftHigh = maxHigh(left);
  const rightHigh = maxHigh(right);
  const bottomLow = minLow(bottom);
  const depth = (leftHigh - bottomLow) / leftHigh;
  const rimAligned = Math.abs(leftHigh - rightHigh) / leftHigh < 0.04;
  const handleHigh = maxHigh(handle);
  const handleRetrace = (rightHigh - minLow(handle)) / rightHigh;
  if (
    depth > 0.12 &&
    depth < 0.45 &&
    rimAligned &&
    handleHigh <= rightHigh &&
    handleRetrace < 0.12
  ) {
    return {
      type: 'cup_handle',
      quality: 75,
      notes: ['Cup-and-handle: rounded base with a shallow handle under the rim'],
    };
  }
  return null;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function maxHigh(candles: Candle[]): number {
  return Math.max(...candles.map((c) => c.high));
}

function minLow(candles: Candle[]): number {
  return Math.min(...candles.map((c) => c.low));
}

function firstOpen(candles: Candle[]): number {
  return candles[0]?.open ?? 0;
}

function lastClose(candles: Candle[]): number {
  return candles[candles.length - 1]?.close ?? 0;
}

export const PATTERN_PRIORITY: SetupType[] = [
  'breakout',
  'cup_handle',
  'flag',
  'ascending_triangle',
];
