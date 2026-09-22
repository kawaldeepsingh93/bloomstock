import { computeLevels } from './levels';
import { dailyChangePercent, summarizeTape, tapeRowFromCandles } from './tape';
import type { Candle } from '@bloomstock/core';

function candle(partial: Partial<Candle> & { close: number; high: number; low: number }): Candle {
  return {
    symbol: 'INFY',
    exchange: 'NSE',
    timeframe: '1d',
    timestamp: new Date('2026-09-01T00:00:00Z'),
    open: partial.close,
    volume: 1,
    ...partial,
  };
}

describe('levels', () => {
  it('uses the last 20-day high/low and a classic pivot', () => {
    const candles = Array.from({ length: 20 }, (_, i) =>
      candle({
        timestamp: new Date(Date.UTC(2026, 8, i + 1)),
        high: 100 + i,
        low: 90,
        close: 95 + i,
      }),
    );
    const levels = computeLevels(candles);
    expect(levels?.resistance).toBe(119);
    expect(levels?.support).toBe(90);
    expect(levels?.pivot).toBeGreaterThan(levels!.support);
  });
});

describe('tape', () => {
  it('ranks gainers, losers, and sector breadth from real close-to-close changes', () => {
    const summary = summarizeTape([
      {
        symbol: 'A',
        exchange: 'NSE',
        lastPrice: 110,
        previousClose: 100,
        sector: 'IT',
        asOf: new Date(),
      },
      {
        symbol: 'B',
        exchange: 'NSE',
        lastPrice: 90,
        previousClose: 100,
        sector: 'IT',
        asOf: new Date(),
      },
      {
        symbol: 'C',
        exchange: 'NSE',
        lastPrice: 105,
        previousClose: 100,
        sector: 'Banks',
        asOf: new Date(),
      },
    ]);
    expect(dailyChangePercent(110, 100)).toBe(10);
    expect(summary.gainers[0]?.symbol).toBe('A');
    expect(summary.losers[0]?.symbol).toBe('B');
    expect(summary.sectors[0]?.sector).toBe('Banks');
  });

  it('needs two closes before emitting a tape row', () => {
    const one = [candle({ close: 100, high: 101, low: 99 })];
    expect(tapeRowFromCandles(one, 'IT')).toBeNull();
    const two = [
      candle({ timestamp: new Date('2026-09-01'), close: 100, high: 101, low: 99 }),
      candle({ timestamp: new Date('2026-09-02'), close: 110, high: 111, low: 109 }),
    ];
    expect(tapeRowFromCandles(two, 'IT')).toEqual({
      symbol: 'INFY',
      exchange: 'NSE',
      lastPrice: 110,
      previousClose: 100,
      sector: 'IT',
      asOf: new Date('2026-09-02'),
    });
  });
});
