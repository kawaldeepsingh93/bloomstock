import { MarketDataError } from '@bloomstock/core';
import type { DailyScanSummary, MarketOverview, ScanFilters } from '@bloomstock/core';
import type { MarketRepository, ScanRepository } from '@bloomstock/database';
import { mapPool, nseSessionDate, toIsoDate } from '@bloomstock/shared';
import {
  applySwingDiscipline,
  noTradeReason,
  passesSnapshotFilters,
  scanSwingCandidates,
} from '@bloomstock/trading';
import type { CacheClient } from '@bloomstock/market-data';

const CANDLE_FETCH_CONCURRENCY = 8;

export class ScanService {
  constructor(
    private readonly market: MarketRepository,
    private readonly scans: ScanRepository,
    private readonly cache: CacheClient,
  ) {}

  async overview(): Promise<MarketOverview> {
    const cached = await this.cache.get<MarketOverview>('market:overview');
    if (cached) return cached;
    const stored = await this.market.latestOverview();
    if (stored) {
      await this.cache.set('market:overview', stored, 10 * 60);
      return stored;
    }
    throw new MarketDataError(
      'ingestion',
      'Market overview is not in cache. Run the morning worker after connecting Kite Connect.',
    );
  }

  async sessionScan(): Promise<DailyScanSummary | null> {
    const session = toIsoDate(nseSessionDate());
    return (await this.scans.getByDate(session)) ?? this.scans.getLatest();
  }

  async runScan(input: {
    capital: number;
    riskPercent: number;
    filters?: ScanFilters;
    limit?: number;
  }): Promise<DailyScanSummary> {
    if (!input.filters) {
      const existing = await this.scans.getByDate(toIsoDate(nseSessionDate()));
      if (existing) return this.withEntryDiscipline(existing, input.capital, input.riskPercent);
    }
    let overview: MarketOverview;
    try {
      overview = await this.overview();
    } catch (error) {
      const fallback = await this.scans.getLatest();
      if (fallback) return this.withEntryDiscipline(fallback, input.capital, input.riskPercent);
      throw error;
    }
    const universe = await this.market.listActiveUniverse(2000);
    const snapshots = await this.market.latestIndicators(universe.map((item) => item.symbol));
    const snapshotMap = new Map(snapshots.map((item) => [item.symbol, item]));
    const eligible = universe.flatMap((instrument) => {
      const snapshot = snapshotMap.get(instrument.symbol);
      if (!snapshot) return [];
      if (!passesSnapshotFilters(instrument, snapshot, input.filters)) return [];
      return [{ instrument, snapshot }];
    });
    const stocks = await mapPool(eligible, CANDLE_FETCH_CONCURRENCY, async ({ instrument, snapshot }) => {
      try {
        const candles = await this.market.getCandles(instrument.symbol, instrument.exchange, '1d', 80);
        return { instrument, snapshot, candles };
      } catch {
        return { instrument, snapshot, candles: [] };
      }
    });
    const candidates = scanSwingCandidates({
      stocks,
      regime: overview.regime,
      capital: input.capital,
      riskPercent: input.riskPercent,
      filters: input.filters,
      limit: input.limit ?? 25,
    });
    const summary: DailyScanSummary = {
      scanDate: toIsoDate(nseSessionDate()),
      regime: overview.regime,
      stocksScanned: stocks.length,
      candidates,
      noTradeReason: noTradeReason(overview.regime, candidates),
    };
    await this.scans.saveDailyScan(summary);
    return summary;
  }

  private async withEntryDiscipline(
    scan: DailyScanSummary,
    capital: number,
    riskPercent: number,
  ): Promise<DailyScanSummary> {
    if (scan.candidates.length === 0) return scan;
    const snapshots = await this.market.latestIndicators(scan.candidates.map((item) => item.symbol));
    const snapshotMap = new Map(snapshots.map((item) => [item.symbol, item]));
    const candidates = await mapPool(scan.candidates, CANDLE_FETCH_CONCURRENCY, async (candidate) => {
      const snapshot = snapshotMap.get(candidate.symbol);
      if (!snapshot) return candidate;
      try {
        const candles = await this.market.getCandles(candidate.symbol, candidate.exchange, '1d', 252);
        return applySwingDiscipline(candidate, candles, snapshot, capital, riskPercent);
      } catch {
        return candidate;
      }
    });
    return { ...scan, candidates };
  }
}
