import { INDICATOR_LOOKBACK_DAYS, SCAN_UNIVERSE_SIZE } from '@bloomstock/core';
import type { Candle, IndicatorSnapshot, Instrument, MarketOverview } from '@bloomstock/core';
import type { MarketRepository } from '@bloomstock/database';
import { createLogger } from '@bloomstock/shared';
import { calculateIndicators, classifyRegime, summarizeTape, tapeRowFromCandles, type TapeRow } from '@bloomstock/trading';
import type { KiteMarketDataProvider } from './kite-provider';
import type { NseFiiProvider } from './nse-fii-provider';
import type { NseIpoProvider, NseNewsProvider } from './nse-news-provider';

const log = createLogger('ingestion');

const BATCH_SIZE = 1;
const BATCH_PAUSE_MS = 400;
const TRADING_DAYS_PER_YEAR = 252;
const CALENDAR_LOOKBACK_DAYS =
  Math.ceil((INDICATOR_LOOKBACK_DAYS * 365) / TRADING_DAYS_PER_YEAR) + 30;

export class IngestionService {
  constructor(
    private readonly kite: KiteMarketDataProvider,
    private readonly fii: NseFiiProvider,
    private readonly market: MarketRepository,
    private readonly news?: NseNewsProvider,
    private readonly ipos?: NseIpoProvider,
  ) {}

  async runMorningJob(now = new Date()): Promise<MarketOverview> {
    const universe = await this.syncUniverse();
    const overview = await this.syncIndexesAndFlows();
    const slice = universe.slice(0, SCAN_UNIVERSE_SIZE);
    const tapeRows = await this.syncHistoryAndIndicators(slice, now);
    await this.syncNewsAndIpos();
    return { ...overview, ...summarizeTape(tapeRows) };
  }

  private async syncNewsAndIpos(): Promise<void> {
    if (this.news) {
      try {
        await this.market.insertNews(await this.news.latest());
      } catch (error: unknown) {
        log.error('News ingest failed', { error: String(error) });
      }
    }
    if (this.ipos) {
      try {
        await this.market.upsertIpos(await this.ipos.current());
      } catch (error: unknown) {
        log.error('IPO ingest failed', { error: String(error) });
      }
    }
  }

  async syncUniverse(): Promise<Instrument[]> {
    const instruments = await this.kite.listEquityUniverse('NSE');
    await this.market.upsertInstruments(instruments);
    log.info('Synced NSE equity universe', { count: instruments.length });
    return instruments;
  }

  async syncIndexesAndFlows(): Promise<MarketOverview> {
    const [nifty, bankNifty, vix, fiiDii] = await Promise.all([
      this.kite.getNifty(),
      this.kite.getBankNifty(),
      this.kite.getIndiaVix(),
      this.fii.getLatest().catch((error: unknown) => {
        log.error('FII/DII download failed', { error: String(error) });
        return null;
      }),
    ]);
    if (fiiDii) {
      await this.market.upsertFiiDii(fiiDii);
    }
    const overview: MarketOverview = {
      nifty: {
        symbol: 'NIFTY 50',
        lastPrice: nifty.lastPrice,
        changePercent: nifty.changePercent,
        asOf: nifty.asOf,
      },
      bankNifty: {
        symbol: 'NIFTY BANK',
        lastPrice: bankNifty.lastPrice,
        changePercent: bankNifty.changePercent,
        asOf: bankNifty.asOf,
      },
      vix: {
        symbol: 'INDIA VIX',
        lastPrice: vix.lastPrice,
        changePercent: vix.changePercent,
        asOf: vix.asOf,
      },
      fiiDii,
      regime: classifyRegime({
        nifty: {
          symbol: 'NIFTY 50',
          lastPrice: nifty.lastPrice,
          changePercent: nifty.changePercent,
          asOf: nifty.asOf,
        },
        vix: {
          symbol: 'INDIA VIX',
          lastPrice: vix.lastPrice,
          changePercent: vix.changePercent,
          asOf: vix.asOf,
        },
        fiiDii,
      }),
      asOf: nifty.asOf,
      gainers: [],
      losers: [],
      sectors: [],
    };
    return overview;
  }

  async syncHistoryAndIndicators(instruments: Instrument[], now: Date): Promise<TapeRow[]> {
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - CALENDAR_LOOKBACK_DAYS);
    const tapeRows: TapeRow[] = [];
    for (let i = 0; i < instruments.length; i += BATCH_SIZE) {
      const batch = instruments.slice(i, i + BATCH_SIZE);
      const rows = await Promise.all(
        batch.map((instrument) => this.syncOne(instrument, from, now)),
      );
      for (const row of rows) {
        if (row) tapeRows.push(row);
      }
      log.info('Ingested batch', { done: Math.min(i + BATCH_SIZE, instruments.length) });
      if (i + BATCH_SIZE < instruments.length) {
        await sleep(BATCH_PAUSE_MS);
      }
    }
    return tapeRows;
  }

  private async syncOne(instrument: Instrument, from: Date, to: Date): Promise<TapeRow | null> {
    try {
      const candles: Candle[] = await this.kite.getHistorical(
        instrument.symbol,
        instrument.exchange,
        '1d',
        from,
        to,
      );
      await this.market.insertCandles(candles);
      const tape = tapeRowFromCandles(candles, instrument.sector);
      if (candles.length < 200) {
        log.warn('Skipping indicators; insufficient history', { symbol: instrument.symbol });
        return tape;
      }
      const snapshot: IndicatorSnapshot = calculateIndicators(candles, '1d');
      await this.market.insertIndicators([snapshot]);
      return tape;
    } catch (error: unknown) {
      log.warn('Skipping symbol after Kite history failure', {
        symbol: instrument.symbol,
        error,
      });
      return null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
