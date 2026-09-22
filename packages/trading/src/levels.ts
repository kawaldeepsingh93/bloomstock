import type { Candle, PriceLevels } from '@bloomstock/core';
import { roundTo } from '@bloomstock/shared';

export function computeLevels(candles: Candle[]): PriceLevels | null {
  if (candles.length < 5) return null;
  const ordered = [...candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const window = ordered.slice(-20);
  const last = window[window.length - 1];
  if (!last) return null;
  const pivot = (last.high + last.low + last.close) / 3;
  return {
    pivot: roundTo(pivot, 2),
    resistance: roundTo(Math.max(...window.map((c) => c.high)), 2),
    support: roundTo(Math.min(...window.map((c) => c.low)), 2),
  };
}
