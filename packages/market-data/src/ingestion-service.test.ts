import type { Candle, Instrument } from '@bloomstock/core';
import { IngestionService } from './ingestion-service';
import type { KiteMarketDataProvider } from './kite-provider';
import type { MarketRepository } from '@bloomstock/database';

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

function candles(symbol: string): Candle[] {
  return [
    {
      symbol,
      exchange: 'NSE',
      timeframe: '1d',
      timestamp: new Date('2026-09-16T00:00:00Z'),
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1_000,
    },
    {
      symbol,
      exchange: 'NSE',
      timeframe: '1d',
      timestamp: new Date('2026-09-17T00:00:00Z'),
      open: 100,
      high: 112,
      low: 100,
      close: 110,
      volume: 1_200,
    },
  ];
}

describe('IngestionService.syncHistoryAndIndicators', () => {
  it('skips a failed symbol and continues the batch', async () => {
    const insertCandles = jest.fn().mockResolvedValue(undefined);
    const kite = {
      getHistorical: jest.fn(async (symbol: string) => {
        if (symbol === 'BAD') throw new Error('Too many requests');
        return candles(symbol);
      }),
    };
    const market = { insertCandles, insertIndicators: jest.fn() };
    const ingestion = new IngestionService(
      kite as unknown as KiteMarketDataProvider,
      {} as never,
      market as unknown as MarketRepository,
    );

    const rows = await ingestion.syncHistoryAndIndicators(
      [instrument('BAD'), instrument('RELIANCE')],
      new Date('2026-09-18T00:00:00Z'),
    );

    expect(rows.map((row) => row.symbol)).toEqual(['RELIANCE']);
    expect(insertCandles).toHaveBeenCalledTimes(1);
    const from = (kite.getHistorical as jest.Mock).mock.calls[0][3] as Date;
    const spanDays =
      (new Date('2026-09-18T00:00:00Z').getTime() - from.getTime()) / 86_400_000;
    expect(spanDays).toBeGreaterThanOrEqual(390);
  });
});
