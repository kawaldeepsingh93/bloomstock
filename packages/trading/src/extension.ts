import type { Candle, EntryStyle, IndicatorSnapshot, SwingCandidate } from '@bloomstock/core';
import { roundTo } from '@bloomstock/shared';
import { buildRiskPlan } from './risk';

const LOOKBACK_HIGH_BARS = 252;
const CHASE_DAY_RETURN = 0.05;
const CHASE_NEAR_HIGH = 0.03;
const CHASE_RSI = 65;
const DIP_ATR_HIGH = 0.4;
const DIP_ATR_LOW = 0.8;

export interface SwingEntryPlan {
  style: EntryStyle;
  entry: number;
  stopFromClose: boolean;
  buyZoneLow: number | null;
  buyZoneHigh: number | null;
  breakoutTrigger: number | null;
  reasons: string[];
}

export function rangeHigh(candles: Candle[], bars = LOOKBACK_HIGH_BARS): number {
  const window = candles.slice(-bars);
  return window.length === 0 ? 0 : Math.max(...window.map((candle) => candle.high));
}

export function dayReturn(candles: Candle[]): number | null {
  const last = candles[candles.length - 1];
  const prior = candles[candles.length - 2];
  if (!last || !prior || prior.close <= 0) return null;
  return (last.close - prior.close) / prior.close;
}

export function isChaseClose(candles: Candle[], rsi: number, atr: number): boolean {
  const last = candles[candles.length - 1];
  if (!last) return false;
  const ret = dayReturn(candles);
  const high = rangeHigh(candles);
  const nearHigh = high > 0 && (high - last.close) / high <= CHASE_NEAR_HIGH;
  const vertical = ret !== null && ret >= CHASE_DAY_RETURN;
  const wideAtrDay =
    ret !== null && last.close > 0 && atr > 0 && ret >= (1.5 * atr) / last.close;
  if (vertical || wideAtrDay) return true;
  return nearHigh && rsi >= CHASE_RSI;
}

export function planSwingEntry(candles: Candle[], close: number, atr: number, rsi: number): SwingEntryPlan {
  if (!isChaseClose(candles, rsi, atr) || atr <= 0) {
    return {
      style: 'at_close',
      entry: close,
      stopFromClose: false,
      buyZoneLow: null,
      buyZoneHigh: null,
      breakoutTrigger: null,
      reasons: [],
    };
  }

  const last = candles[candles.length - 1]!;
  const ret = dayReturn(candles) ?? 0;
  const yearHigh = rangeHigh(candles);
  const nearHigh = yearHigh > 0 && (yearHigh - close) / yearHigh <= CHASE_NEAR_HIGH;
  const buyZoneHigh = roundTo(Math.max(close - atr * DIP_ATR_HIGH, 0.01), 2);
  const buyZoneLow = roundTo(Math.max(close - atr * DIP_ATR_LOW, 0.01), 2);
  const low = Math.min(buyZoneLow, buyZoneHigh);
  const zoneHigh = Math.max(buyZoneLow, buyZoneHigh);
  const breakoutTrigger = roundTo((nearHigh ? Math.max(last.high, yearHigh) : last.high) * 1.002, 2);
  const context = nearHigh
    ? `after a ${(ret * 100).toFixed(1)}% day near the 52-week high ${yearHigh.toFixed(2)}`
    : `after a ${(ret * 100).toFixed(1)}% day`;

  return {
    style: 'buy_dip',
    entry: zoneHigh,
    stopFromClose: true,
    buyZoneLow: low,
    buyZoneHigh: zoneHigh,
    breakoutTrigger,
    reasons: [
      `Do not chase today's close at ${close.toFixed(2)} ${context}.`,
      `Buy on dip ${low.toFixed(2)}-${zoneHigh.toFixed(2)}; breakout buy only above ${breakoutTrigger.toFixed(2)}.`,
    ],
  };
}

export function applySwingDiscipline(
  candidate: SwingCandidate,
  candles: Candle[],
  snapshot: IndicatorSnapshot,
  capital: number,
  riskPercent: number,
): SwingCandidate {
  if (candidate.verdict === 'no_trade' || candles.length < 2 || snapshot.atr <= 0) {
    return candidate;
  }
  const plan = planSwingEntry(candles, snapshot.close, snapshot.atr, snapshot.rsi);
  const risk = buildRiskPlan({
    capital,
    riskPercent,
    snapshot,
    entry: plan.entry,
    stopLoss: plan.stopFromClose
      ? roundTo(snapshot.close - snapshot.atr * 1.5, 2)
      : undefined,
  });
  risk.entryStyle = plan.style;
  risk.buyZoneLow = plan.buyZoneLow;
  risk.buyZoneHigh = plan.buyZoneHigh;
  risk.breakoutTrigger = plan.breakoutTrigger;
  const reasons = [
    ...candidate.score.reasons.filter(
      (reason) => !reason.startsWith('Do not chase') && !reason.startsWith('Buy on dip'),
    ),
    ...plan.reasons,
  ];
  return {
    ...candidate,
    score: { ...candidate.score, reasons },
    risk,
    verdict: plan.style === 'buy_dip' ? 'watch' : 'trade',
  };
}
