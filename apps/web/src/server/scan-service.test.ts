import type { DailyScanSummary, Instrument } from '@bloomstock/core';
import { ScanService } from './scan-service';

const savedScan: DailyScanSummary = {
  scanDate: '2026-09-18',
  regime: 'bullish',
  stocksScanned: 1800,
  candidates: [],
  noTradeReason: 'No Trade Today. No stock cleared trend, momentum, volume, and structure filters.',
};

function instrument(symbol: string): Instrument {
  return {
    symbol,
    exchange: 'NSE',
    name: symbol,
    isin: null,
    sector: 'Energy',
    industry: null,
    marketCap: null,
    lotSize: 1,
    tickSize: 0.05,
    isActive: true,
  };
}

describe('ScanService.runScan', () => {
  it('reuses the morning session scan instead of refetching candles', async () => {
    const getCandles = jest.fn();
    const service = new ScanService(
      {
        listActiveUniverse: jest.fn(),
        latestIndicators: jest.fn(),
        getCandles,
        latestOverview: jest.fn(),
      } as never,
      {
        getByDate: jest.fn().mockResolvedValue(savedScan),
        saveDailyScan: jest.fn(),
      } as never,
      { get: jest.fn(), set: jest.fn() } as never,
    );

    await expect(
      service.runScan({ capital: 100_000, riskPercent: 1, limit: 3 }),
    ).resolves.toEqual(savedScan);
    expect(getCandles).not.toHaveBeenCalled();
  });

  it('re-applies dip discipline to stored morning picks before Recommend uses them', async () => {
    const stored: DailyScanSummary = {
      ...savedScan,
      noTradeReason: null,
      candidates: [
        {
          symbol: 'EIHOTEL',
          exchange: 'NSE',
          name: 'EIHOTEL',
          setupType: 'breakout',
          score: {
            trend: 80,
            momentum: 80,
            volume: 80,
            structure: 80,
            total: 80,
            reasons: ['breakout structure detected'],
            rejects: [],
          },
          risk: {
            capital: 100_000,
            riskPercent: 1,
            riskAmount: 1000,
            entry: 317.9,
            stopLoss: 303.92,
            target1: 345.86,
            target2: 359.84,
            positionSize: 71,
            positionValue: 0,
            riskReward: 2,
            atr: 9.32,
            trailingStop: 0,
            entryStyle: 'at_close',
            buyZoneLow: null,
            buyZoneHigh: null,
            breakoutTrigger: null,
          },
          confidence: 80,
          verdict: 'trade',
          rejectedReason: null,
        },
      ],
    };
    const getCandles = jest.fn().mockResolvedValue([
      {
        symbol: 'EIHOTEL',
        exchange: 'NSE',
        timeframe: '1d',
        timestamp: new Date('2026-09-17'),
        open: 296,
        high: 301,
        low: 294,
        close: 299.9,
        volume: 600_000,
      },
      {
        symbol: 'EIHOTEL',
        exchange: 'NSE',
        timeframe: '1d',
        timestamp: new Date('2026-09-18'),
        open: 300,
        high: 322,
        low: 299,
        close: 317.9,
        volume: 1_800_000,
      },
    ]);
    const service = new ScanService(
      {
        latestIndicators: jest.fn().mockResolvedValue([
          {
            symbol: 'EIHOTEL',
            exchange: 'NSE',
            timeframe: '1d',
            asOf: new Date('2026-09-18'),
            close: 317.9,
            volume: 1,
            ema20: 310,
            ema50: 305,
            ema200: 320,
            rsi: 63,
            macd: 1,
            macdSignal: 0.4,
            macdHistogram: 0.6,
            atr: 9.32,
            bbUpper: 330,
            bbMiddle: 310,
            bbLower: 290,
            volumeRatio: 3.9,
            averageVolume20: 1,
          },
        ]),
        getCandles,
      } as never,
      {
        getByDate: jest.fn().mockResolvedValue(stored),
        saveDailyScan: jest.fn(),
      } as never,
      { get: jest.fn(), set: jest.fn() } as never,
    );

    const scan = await service.runScan({ capital: 100_000, riskPercent: 1, limit: 3 });
    expect(scan.candidates[0]?.verdict).toBe('watch');
    expect(scan.candidates[0]?.risk?.entry).toBeLessThan(317.9);
    expect(scan.candidates[0]?.risk?.breakoutTrigger).toBe(322.64);
  });

  it('loads candles when the caller passes filters', async () => {
    const getCandles = jest.fn().mockResolvedValue([]);
    const scans = {
      getByDate: jest.fn().mockResolvedValue(savedScan),
      saveDailyScan: jest.fn().mockResolvedValue('scan-1'),
    };
    const service = new ScanService(
      {
        listActiveUniverse: jest.fn().mockResolvedValue([instrument('RELIANCE')]),
        latestIndicators: jest.fn().mockResolvedValue([
          {
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
            volumeRatio: 1.2,
            averageVolume20: 1,
          },
        ]),
        getCandles,
        latestOverview: jest.fn().mockResolvedValue({
          nifty: { symbol: 'NIFTY 50', lastPrice: 1, changePercent: 1, asOf: new Date() },
          bankNifty: { symbol: 'NIFTY BANK', lastPrice: 1, changePercent: 1, asOf: new Date() },
          vix: { symbol: 'INDIA VIX', lastPrice: 12, changePercent: 0, asOf: new Date() },
          fiiDii: null,
          regime: 'bullish',
          asOf: new Date(),
          gainers: [],
          losers: [],
          sectors: [],
        }),
      } as never,
      scans as never,
      { get: jest.fn().mockResolvedValue(null), set: jest.fn() } as never,
    );

    await service.runScan({
      capital: 100_000,
      riskPercent: 1,
      filters: { rsiMin: 50 },
    });
    expect(getCandles).toHaveBeenCalled();
    expect(scans.saveDailyScan).not.toHaveBeenCalled();
  });

  it('skips candle fetches for names that fail snapshot filters', async () => {
    const getCandles = jest.fn().mockResolvedValue([]);
    const snapshot = {
      exchange: 'NSE' as const,
      timeframe: '1d' as const,
      asOf: new Date('2026-09-18T00:00:00Z'),
      close: 1400,
      volume: 1,
      ema20: 1390,
      ema50: 1380,
      ema200: 1200,
      macd: 1,
      macdSignal: 0.5,
      macdHistogram: 0.5,
      atr: 20,
      bbUpper: 1450,
      bbMiddle: 1400,
      bbLower: 1350,
      volumeRatio: 2,
      averageVolume20: 1,
    };
    const service = new ScanService(
      {
        listActiveUniverse: jest.fn().mockResolvedValue([instrument('RELIANCE'), instrument('WEAK')]),
        latestIndicators: jest.fn().mockResolvedValue([
          { ...snapshot, symbol: 'RELIANCE', rsi: 61 },
          { ...snapshot, symbol: 'WEAK', rsi: 40 },
        ]),
        getCandles,
        latestOverview: jest.fn().mockResolvedValue({
          nifty: { symbol: 'NIFTY 50', lastPrice: 1, changePercent: 1, asOf: new Date() },
          bankNifty: { symbol: 'NIFTY BANK', lastPrice: 1, changePercent: 1, asOf: new Date() },
          vix: { symbol: 'INDIA VIX', lastPrice: 12, changePercent: 0, asOf: new Date() },
          fiiDii: null,
          regime: 'bullish',
          asOf: new Date(),
          gainers: [],
          losers: [],
          sectors: [],
        }),
      } as never,
      {
        getByDate: jest.fn().mockResolvedValue(null),
        saveDailyScan: jest.fn().mockResolvedValue('scan-1'),
      } as never,
      { get: jest.fn().mockResolvedValue(null), set: jest.fn() } as never,
    );

    await service.runScan({
      capital: 100_000,
      riskPercent: 1,
      filters: { rsiMin: 55, rsiMax: 70 },
    });
    expect(getCandles).toHaveBeenCalledTimes(1);
    expect(getCandles.mock.calls[0]?.[0]).toBe('RELIANCE');
  });
});
