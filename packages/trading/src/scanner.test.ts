import { passesSnapshotFilters } from './scanner';
import type { IndicatorSnapshot, Instrument } from '@bloomstock/core';

const instrument: Instrument = {
  symbol: 'RELIANCE',
  exchange: 'NSE',
  name: 'Reliance',
  isin: null,
  sector: 'Energy',
  industry: null,
  marketCap: 1,
  lotSize: 1,
  tickSize: 0.05,
  isActive: true,
};

const snapshot: IndicatorSnapshot = {
  symbol: 'RELIANCE',
  exchange: 'NSE',
  timeframe: '1d',
  asOf: new Date('2026-09-18T00:00:00Z'),
  close: 1400,
  volume: 1,
  ema20: 1390,
  ema50: 1380,
  ema200: 1200,
  rsi: 61,
  macd: 1,
  macdSignal: 0.5,
  macdHistogram: 0.5,
  atr: 20,
  bbUpper: 1450,
  bbMiddle: 1400,
  bbLower: 1350,
  volumeRatio: 1.8,
  averageVolume20: 1,
};

describe('passesSnapshotFilters', () => {
  it('keeps a name inside the RSI and volume band', () => {
    expect(
      passesSnapshotFilters(instrument, snapshot, {
        rsiMin: 55,
        rsiMax: 70,
        volumeRatioMin: 1.5,
        aboveEma20: true,
        aboveEma50: true,
      }),
    ).toBe(true);
  });

  it('drops a name below the RSI floor', () => {
    expect(
      passesSnapshotFilters(instrument, { ...snapshot, rsi: 40 }, { rsiMin: 55, rsiMax: 70 }),
    ).toBe(false);
  });
});
