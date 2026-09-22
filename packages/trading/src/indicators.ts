import type { Candle, Exchange, IndicatorSnapshot, Timeframe } from '@bloomstock/core';
import { AppError } from '@bloomstock/core';
import { roundTo } from '@bloomstock/shared';
import { ATR, BollingerBands, EMA, MACD, RSI, SMA } from 'technicalindicators';

const MIN_CANDLES = 200;

export function assertEnoughHistory(candles: Candle[]): void {
  if (candles.length < MIN_CANDLES) {
    throw new AppError(
      'INSUFFICIENT_HISTORY',
      `Need at least ${MIN_CANDLES} candles to compute indicators, received ${candles.length}`,
      422,
    );
  }
}

export function calculateIndicators(
  candles: Candle[],
  timeframe: Timeframe = '1d',
): IndicatorSnapshot {
  assertEnoughHistory(candles);
  const ordered = [...candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const closes = ordered.map((c) => c.close);
  const highs = ordered.map((c) => c.high);
  const lows = ordered.map((c) => c.low);
  const volumes = ordered.map((c) => c.volume);
  const last = ordered[ordered.length - 1];
  if (!last) {
    throw new AppError('INSUFFICIENT_HISTORY', 'Candle series is empty', 422);
  }

  const ema20 = lastOf(EMA.calculate({ period: 20, values: closes }));
  const ema50 = lastOf(EMA.calculate({ period: 50, values: closes }));
  const ema200 = lastOf(EMA.calculate({ period: 200, values: closes }));
  const rsi = lastOf(RSI.calculate({ period: 14, values: closes }));
  const macdSeries = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const macd = macdSeries[macdSeries.length - 1];
  const atr = lastOf(ATR.calculate({ high: highs, low: lows, close: closes, period: 14 }));
  const bands = lastOf(BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 }));
  const averageVolume20 = lastOf(SMA.calculate({ period: 20, values: volumes }));

  if (
    !macd ||
    macd.MACD === undefined ||
    macd.signal === undefined ||
    macd.histogram === undefined
  ) {
    throw new AppError(
      'INDICATOR_FAILURE',
      'MACD calculation did not return a complete value',
      500,
    );
  }

  return {
    symbol: last.symbol,
    exchange: last.exchange as Exchange,
    timeframe,
    asOf: last.timestamp,
    close: roundTo(last.close, 2),
    volume: last.volume,
    ema20: roundTo(ema20, 2),
    ema50: roundTo(ema50, 2),
    ema200: roundTo(ema200, 2),
    rsi: roundTo(rsi, 2),
    macd: roundTo(macd.MACD, 4),
    macdSignal: roundTo(macd.signal, 4),
    macdHistogram: roundTo(macd.histogram, 4),
    atr: roundTo(atr, 2),
    bbUpper: roundTo(bands.upper, 2),
    bbMiddle: roundTo(bands.middle, 2),
    bbLower: roundTo(bands.lower, 2),
    averageVolume20: roundTo(averageVolume20, 0),
    volumeRatio: averageVolume20 === 0 ? 0 : roundTo(last.volume / averageVolume20, 2),
  };
}

function lastOf<T>(values: T[]): T {
  const value = values[values.length - 1];
  if (value === undefined) {
    throw new AppError('INDICATOR_FAILURE', 'Indicator series did not produce a value', 500);
  }
  return value;
}
