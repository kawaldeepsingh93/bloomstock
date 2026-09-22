import type { Candle, IndicatorSnapshot, Instrument } from '@bloomstock/core';
import { planSwingEntry } from './extension';
import { scanSwingCandidates } from './scanner';

function nrbTape(): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < 252; i += 1) {
    const close = i === 251 ? 525.7 : i === 250 ? 471.4 : 400 + i * 0.3;
    const high = i === 10 ? 535 : i === 251 ? 530 : close + 3;
    candles.push({
      symbol: 'NRBBEARING',
      exchange: 'NSE',
      timeframe: '1d',
      timestamp: new Date(Date.UTC(2025, 8, 1 + i)),
      open: close - 8,
      high,
      low: close - 12,
      close,
      volume: i === 251 ? 2_000_000 : 800_000,
    });
  }
  return candles;
}

const nrbInstrument: Instrument = {
  symbol: 'NRBBEARING',
  exchange: 'NSE',
  name: 'NRB Bearings',
  isin: null,
  sector: 'Auto Ancillaries',
  industry: null,
  marketCap: 1,
  lotSize: 1,
  tickSize: 0.05,
  isActive: true,
};

const nrbSnapshot: IndicatorSnapshot = {
  symbol: 'NRBBEARING',
  exchange: 'NSE',
  timeframe: '1d',
  asOf: new Date('2026-09-18T00:00:00Z'),
  close: 525.7,
  volume: 2_000_000,
  ema20: 480,
  ema50: 450,
  ema200: 350,
  rsi: 68,
  macd: 4,
  macdSignal: 2,
  macdHistogram: 2,
  atr: 24,
  bbUpper: 540,
  bbMiddle: 500,
  bbLower: 460,
  volumeRatio: 2.5,
  averageVolume20: 800_000,
};

function eihTape(): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < 252; i += 1) {
    const close = i === 251 ? 317.9 : i === 250 ? 299.9 : 280 + i * 0.05;
    const high = i === 10 ? 414 : i === 251 ? 322 : close + 2;
    candles.push({
      symbol: 'EIHOTEL',
      exchange: 'NSE',
      timeframe: '1d',
      timestamp: new Date(Date.UTC(2025, 8, 1 + i)),
      open: close - 4,
      high,
      low: close - 6,
      close,
      volume: i === 251 ? 1_800_000 : 600_000,
    });
  }
  return candles;
}

describe('planSwingEntry', () => {
  it('does not use the last close after an 11% day under the 52-week high', () => {
    const plan = planSwingEntry(nrbTape(), 525.7, 24, 68);
    expect(plan.style).toBe('buy_dip');
    expect(plan.entry).toBeLessThan(525.7);
    expect(plan.buyZoneLow).toBe(506.5);
    expect(plan.buyZoneHigh).toBe(516.1);
    expect(plan.breakoutTrigger).toBe(536.07);
    expect(plan.reasons[0]).toMatch(/Do not chase/);
  });

  it('treats a 6% day as a chase even when price is far below the 52-week high', () => {
    const plan = planSwingEntry(eihTape(), 317.9, 9.32, 63);
    expect(plan.style).toBe('buy_dip');
    expect(plan.entry).toBeLessThan(317.9);
    expect(plan.breakoutTrigger).toBe(322.64);
    expect(plan.breakoutTrigger).toBeLessThan(414);
    expect(plan.reasons[0]).not.toMatch(/52-week high/);
  });
});

describe('scanSwingCandidates chase discipline', () => {
  it('keeps NRBBEARING as a watch with a dip zone instead of a market buy at 525.7', () => {
    const [row] = scanSwingCandidates({
      regime: 'bullish',
      capital: 100_000,
      riskPercent: 1,
      limit: 5,
      stocks: [{ instrument: nrbInstrument, snapshot: nrbSnapshot, candles: nrbTape() }],
    });
    expect(row?.symbol).toBe('NRBBEARING');
    expect(row?.verdict).toBe('watch');
    expect(row?.risk?.entryStyle).toBe('buy_dip');
    expect(row?.risk?.entry).toBe(516.1);
    expect(row?.risk?.entry).not.toBe(525.7);
    expect(row?.score.reasons.some((reason) => reason.includes('Buy on dip'))).toBe(true);
  });
});
