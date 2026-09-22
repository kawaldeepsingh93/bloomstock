import type { Candle, Quote, SectorPerformance } from '@bloomstock/core';

export interface TapeRow {
  symbol: string;
  exchange: Quote['exchange'];
  lastPrice: number;
  previousClose: number;
  sector: string | null;
  asOf: Date;
}

export function tapeRowFromCandles(candles: Candle[], sector: string | null): TapeRow | null {
  if (candles.length < 2) return null;
  const ordered = [...candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const last = ordered[ordered.length - 1];
  const previous = ordered[ordered.length - 2];
  if (!last || !previous) return null;
  return {
    symbol: last.symbol,
    exchange: last.exchange,
    lastPrice: last.close,
    previousClose: previous.close,
    sector,
    asOf: last.timestamp,
  };
}

export function dailyChangePercent(lastPrice: number, previousClose: number): number {
  if (previousClose === 0) return 0;
  return Number((((lastPrice - previousClose) / previousClose) * 100).toFixed(2));
}

export function summarizeTape(rows: TapeRow[]): {
  gainers: Quote[];
  losers: Quote[];
  sectors: SectorPerformance[];
} {
  const quotes: Quote[] = rows.map((row) => ({
    symbol: row.symbol,
    exchange: row.exchange,
    lastPrice: row.lastPrice,
    open: row.previousClose,
    high: row.lastPrice,
    low: row.lastPrice,
    close: row.previousClose,
    volume: 0,
    changePercent: dailyChangePercent(row.lastPrice, row.previousClose),
    asOf: row.asOf,
  }));
  const ranked = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
  return {
    gainers: ranked.filter((q) => q.changePercent > 0).slice(0, 5),
    losers: ranked.filter((q) => q.changePercent < 0).slice(-5).reverse(),
    sectors: sectorPerformance(rows),
  };
}

function sectorPerformance(rows: TapeRow[]): SectorPerformance[] {
  const buckets = new Map<string, { sum: number; advancing: number; declining: number; count: number }>();
  for (const row of rows) {
    const sector = row.sector ?? 'Unknown';
    const change = dailyChangePercent(row.lastPrice, row.previousClose);
    const current = buckets.get(sector) ?? { sum: 0, advancing: 0, declining: 0, count: 0 };
    current.sum += change;
    current.count += 1;
    if (change > 0) current.advancing += 1;
    if (change < 0) current.declining += 1;
    buckets.set(sector, current);
  }
  return [...buckets.entries()]
    .map(([sector, stats]) => ({
      sector,
      changePercent: Number((stats.sum / stats.count).toFixed(2)),
      advancing: stats.advancing,
      declining: stats.declining,
    }))
    .sort((a, b) => b.changePercent - a.changePercent);
}
