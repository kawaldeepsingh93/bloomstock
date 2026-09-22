import type { Candle } from '@bloomstock/core';
import { roundTo } from '@bloomstock/shared';
import { calculateIndicators } from './indicators';
import { bestPattern } from './patterns';
import { scoreTechnical } from './scoring';

export interface BacktestTrade {
  symbol: string;
  entryDate: Date;
  exitDate: Date;
  entry: number;
  exit: number;
  pnlPercent: number;
  win: boolean;
}

export interface BacktestReport {
  symbol: string;
  trades: BacktestTrade[];
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  equityCurve: { date: Date; equity: number }[];
}

export interface BacktestInput {
  symbol: string;
  candles: Candle[];
  capital?: number;
}

export function runBacktest(input: BacktestInput): BacktestReport {
  const candles = [...input.candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const capital = input.capital ?? 100_000;
  const trades: BacktestTrade[] = [];
  let equity = capital;
  const equityCurve: { date: Date; equity: number }[] = [];
  let peak = capital;
  let maxDrawdown = 0;
  let open: { entryDate: Date; entry: number; stop: number; target: number } | null = null;

  for (let i = 200; i < candles.length; i += 1) {
    const window = candles.slice(0, i + 1);
    const current = candles[i];
    if (!current) continue;
    const snapshot = calculateIndicators(window);
    if (open) {
      const hitStop = current.low <= open.stop;
      const hitTarget = current.high >= open.target;
      if (hitStop || hitTarget) {
        const exit = hitStop ? open.stop : open.target;
        const pnlPercent = ((exit - open.entry) / open.entry) * 100;
        equity *= 1 + pnlPercent / 100;
        trades.push({
          symbol: input.symbol,
          entryDate: open.entryDate,
          exitDate: current.timestamp,
          entry: open.entry,
          exit,
          pnlPercent: roundTo(pnlPercent, 2),
          win: !hitStop,
        });
        open = null;
      }
    } else {
      const pattern = bestPattern(window);
      const score = scoreTechnical(snapshot, pattern);
      if (!pattern || score.rejects.length > 0 || score.total < 70) {
        equityCurve.push({ date: current.timestamp, equity: roundTo(equity, 2) });
        peak = Math.max(peak, equity);
        maxDrawdown = Math.max(maxDrawdown, peak === 0 ? 0 : (peak - equity) / peak);
        continue;
      }
      const stop = snapshot.close - snapshot.atr * 1.5;
      const target = snapshot.close + (snapshot.close - stop) * 2;
      open = { entryDate: current.timestamp, entry: snapshot.close, stop, target };
    }
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak === 0 ? 0 : (peak - equity) / peak);
    equityCurve.push({ date: current.timestamp, equity: roundTo(equity, 2) });
  }

  const wins = trades.filter((t) => t.win);
  const losses = trades.filter((t) => !t.win);
  const grossProfit = wins.reduce((sum, t) => sum + Math.max(t.pnlPercent, 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + Math.min(t.pnlPercent, 0), 0));
  const returns = trades.map((t) => t.pnlPercent);
  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1)
      : 0;
  const stdev = Math.sqrt(variance);

  return {
    symbol: input.symbol,
    trades,
    winRate: trades.length === 0 ? 0 : roundTo((wins.length / trades.length) * 100, 2),
    profitFactor: grossLoss === 0 ? grossProfit : roundTo(grossProfit / grossLoss, 2),
    maxDrawdown: roundTo(maxDrawdown * 100, 2),
    sharpeRatio: stdev === 0 ? 0 : roundTo((mean / stdev) * Math.sqrt(252), 2),
    equityCurve,
  };
}
