import type { Candle, IndicatorSnapshot } from '@bloomstock/core';
import { calculateIndicators } from './indicators';
import { detectPatterns } from './patterns';
import { analyzePortfolio } from './portfolio';
import { classifyRegime } from './regime';
import { buildRiskPlan } from './risk';
import { scanSwingCandidates } from './scanner';
import { scoreTechnical } from './scoring';

function makeCandles(overrides?: Partial<Candle>[]): Candle[] {
  const candles: Candle[] = [];
  let price = 100;
  for (let i = 0; i < 220; i += 1) {
    const drift = i > 180 ? 1.4 : 0.35;
    price += drift;
    const open = price - 0.4;
    const close = price;
    const high = close + 0.8;
    const low = open - 0.3;
    candles.push({
      symbol: 'RELIANCE',
      exchange: 'NSE',
      timeframe: '1d',
      timestamp: new Date(Date.UTC(2025, 0, 1 + i)),
      open,
      high,
      low,
      close,
      volume: i > 210 ? 2_000_000 : 800_000,
    });
  }
  if (overrides) {
    for (const [index, patch] of overrides.entries()) {
      const target = candles[candles.length - overrides.length + index];
      if (target) {
        Object.assign(target, patch);
      }
    }
  }
  return candles;
}

describe('indicators', () => {
  it('computes EMA, RSI, MACD, ATR, bands, and volume ratio from candles', () => {
    const snapshot = calculateIndicators(makeCandles());
    expect(snapshot.ema20).toBeGreaterThan(0);
    expect(snapshot.ema50).toBeGreaterThan(0);
    expect(snapshot.ema200).toBeGreaterThan(0);
    expect(snapshot.rsi).toBeGreaterThan(50);
    expect(snapshot.atr).toBeGreaterThan(0);
    expect(snapshot.volumeRatio).toBeGreaterThan(1);
  });

  it('rejects short history instead of inventing values', () => {
    expect(() => calculateIndicators(makeCandles().slice(0, 20))).toThrow(/at least 200 candles/);
  });
});

describe('risk engine', () => {
  it('sizes a 1% risk book with ATR stop and 1:2 / 1:3 targets', () => {
    const snapshot: IndicatorSnapshot = {
      symbol: 'TCS',
      exchange: 'NSE',
      timeframe: '1d',
      asOf: new Date('2026-09-18T10:00:00Z'),
      close: 1000,
      volume: 1_500_000,
      ema20: 980,
      ema50: 960,
      ema200: 900,
      rsi: 62,
      macd: 4,
      macdSignal: 2,
      macdHistogram: 2,
      atr: 20,
      bbUpper: 1040,
      bbMiddle: 1000,
      bbLower: 960,
      volumeRatio: 1.8,
      averageVolume20: 800_000,
    };
    const plan = buildRiskPlan({ capital: 100_000, riskPercent: 1, snapshot });
    expect(plan.riskAmount).toBe(1000);
    expect(plan.stopLoss).toBe(970);
    expect(plan.positionSize).toBe(33);
    expect(plan.target1).toBe(1060);
    expect(plan.target2).toBe(1090);
    expect(plan.trailingStop).toBe(980);
  });
});

describe('scoring and scanner', () => {
  it('returns no-trade candidates when the market is bearish', () => {
    const candles = makeCandles();
    const snapshot = calculateIndicators(candles);
    const result = scanSwingCandidates({
      regime: 'bearish',
      capital: 100_000,
      riskPercent: 1,
      stocks: [
        {
          instrument: {
            symbol: 'RELIANCE',
            exchange: 'NSE',
            name: 'Reliance Industries',
            isin: null,
            sector: 'Energy',
            industry: 'Oil',
            marketCap: 1e12,
            lotSize: 1,
            tickSize: 0.05,
            isActive: true,
          },
          snapshot,
          candles,
        },
      ],
    });
    expect(result).toEqual([]);
  });

  it('scores trend alignment and rejects missing structure', () => {
    const snapshot: IndicatorSnapshot = {
      symbol: 'INFY',
      exchange: 'NSE',
      timeframe: '1d',
      asOf: new Date(),
      close: 1600,
      volume: 1,
      ema20: 1500,
      ema50: 1480,
      ema200: 1400,
      rsi: 60,
      macd: 3,
      macdSignal: 1,
      macdHistogram: 2,
      atr: 20,
      bbUpper: 1650,
      bbMiddle: 1600,
      bbLower: 1550,
      volumeRatio: 2,
      averageVolume20: 1,
    };
    const score = scoreTechnical(snapshot, null);
    expect(score.trend).toBeGreaterThanOrEqual(90);
    expect(score.rejects).toContain('No recognized continuation or breakout structure');
  });

  it('does not treat RSI 68 as a full-score chaseable pocket', () => {
    const snapshot: IndicatorSnapshot = {
      symbol: 'NRBBEARING',
      exchange: 'NSE',
      timeframe: '1d',
      asOf: new Date(),
      close: 525.7,
      volume: 1,
      ema20: 480,
      ema50: 450,
      ema200: 350,
      rsi: 68,
      macd: 3,
      macdSignal: 1,
      macdHistogram: 2,
      atr: 24,
      bbUpper: 540,
      bbMiddle: 500,
      bbLower: 460,
      volumeRatio: 2,
      averageVolume20: 1,
    };
    const score = scoreTechnical(snapshot, {
      type: 'breakout',
      quality: 80,
      notes: [],
    });
    expect(score.reasons.some((reason) => reason.includes('prefer a dip'))).toBe(true);
    expect(score.momentum).toBeLessThan(100);
  });
});

describe('patterns', () => {
  it('detects a 20-day volume-confirmed breakout', () => {
    const candles = makeCandles();
    const last = candles[candles.length - 1];
    if (last) {
      last.close = 400;
      last.high = 405;
      last.volume = 5_000_000;
    }
    const matches = detectPatterns(candles);
    expect(matches.some((match) => match.type === 'breakout')).toBe(true);
  });
});

describe('regime', () => {
  it('classifies a bullish tape from Nifty, VIX, and FII', () => {
    const regime = classifyRegime({
      nifty: { symbol: 'NIFTY 50', lastPrice: 25000, changePercent: 0.8, asOf: new Date() },
      vix: { symbol: 'INDIA VIX', lastPrice: 12, changePercent: -2, asOf: new Date() },
      fiiDii: {
        asOf: new Date(),
        fiiBuy: 4000,
        fiiSell: 2500,
        fiiNet: 1500,
        diiBuy: 2000,
        diiSell: 1800,
        diiNet: 200,
      },
    });
    expect(regime).toBe('bullish');
  });
});

describe('portfolio', () => {
  it('trails winners above EMA20 and sells names that lost EMA50', () => {
    const analysis = analyzePortfolio(
      'p1',
      100_000,
      [
        {
          id: '1',
          symbol: 'HDFCBANK',
          exchange: 'NSE',
          quantity: 10,
          avgPrice: 1400,
          lastPrice: 1600,
          investedAt: null,
        },
      ],
      new Map([
        [
          'HDFCBANK',
          {
            symbol: 'HDFCBANK',
            exchange: 'NSE',
            timeframe: '1d',
            asOf: new Date(),
            close: 1600,
            volume: 1,
            ema20: 1500,
            ema50: 1450,
            ema200: 1300,
            rsi: 61,
            macd: 1,
            macdSignal: 0.4,
            macdHistogram: 0.6,
            atr: 20,
            bbUpper: 1650,
            bbMiddle: 1500,
            bbLower: 1400,
            volumeRatio: 1.2,
            averageVolume20: 1,
          },
        ],
      ]),
    );
    expect(analysis.advice[0]?.action).toBe('trail');
    expect(analysis.unrealizedPnl).toBe(2000);
  });
});
