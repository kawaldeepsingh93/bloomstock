import {
  NotFoundError,
  sanitizeInstrumentLots,
  type Candle,
  type Exchange,
  type FiiDiiFlow,
  type IndicatorSnapshot,
  type Instrument,
  type IpoIssue,
  type MarketOverview,
  type NewsItem,
  type Timeframe,
} from '@bloomstock/core';
import { asError, chunk } from '@bloomstock/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export class MarketRepository {
  constructor(private readonly db: SupabaseClient) {}

  async upsertInstruments(instruments: Instrument[]): Promise<void> {
    const { error } = await this.db.from('instruments').upsert(
      instruments.map((item) => {
        const lots = sanitizeInstrumentLots(item.lotSize, item.tickSize);
        return {
          symbol: item.symbol,
          exchange: item.exchange,
          name: item.name,
          isin: item.isin,
          sector: item.sector,
          industry: item.industry,
          market_cap: item.marketCap,
          lot_size: lots.lotSize,
          tick_size: lots.tickSize,
          is_active: item.isActive,
        };
      }),
    );
    if (error) throw error;
  }

  async listActiveUniverse(limit = 2000): Promise<Instrument[]> {
    const { data, error } = await this.db
      .from('instruments')
      .select('*')
      .eq('is_active', true)
      .eq('exchange', 'NSE')
      .order('market_cap', { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapInstrument);
  }

  async insertCandles(candles: Candle[]): Promise<void> {
    if (candles.length === 0) return;
    const { error } = await this.db.from('ohlcv').upsert(
      candles.map((candle) => ({
        symbol: candle.symbol,
        exchange: candle.exchange,
        timeframe: candle.timeframe,
        ts: candle.timestamp.toISOString(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      })),
    );
    if (error) throw error;
  }

  async getCandles(
    symbol: string,
    exchange: Exchange,
    timeframe: Timeframe,
    limit = 250,
  ): Promise<Candle[]> {
    const { data, error } = await this.db
      .from('ohlcv')
      .select('*')
      .eq('symbol', symbol)
      .eq('exchange', exchange)
      .eq('timeframe', timeframe)
      .order('ts', { ascending: false })
      .limit(limit);
    if (error) throw asError(error);
    return (data ?? [])
      .map((row) => ({
        symbol: row.symbol,
        exchange: row.exchange,
        timeframe: row.timeframe,
        timestamp: new Date(row.ts),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      }))
      .reverse();
  }

  async insertIndicators(snapshots: IndicatorSnapshot[]): Promise<void> {
    if (snapshots.length === 0) return;
    const { error } = await this.db.from('indicator_snapshots').upsert(
      snapshots.map((item) => ({
        symbol: item.symbol,
        exchange: item.exchange,
        timeframe: item.timeframe,
        as_of: item.asOf.toISOString(),
        close: item.close,
        volume: item.volume,
        ema20: item.ema20,
        ema50: item.ema50,
        ema200: item.ema200,
        rsi: item.rsi,
        macd: item.macd,
        macd_signal: item.macdSignal,
        macd_histogram: item.macdHistogram,
        atr: item.atr,
        bb_upper: item.bbUpper,
        bb_middle: item.bbMiddle,
        bb_lower: item.bbLower,
        volume_ratio: item.volumeRatio,
        average_volume_20: item.averageVolume20,
      })),
    );
    if (error) throw error;
  }

  async latestIndicators(symbols: string[]): Promise<IndicatorSnapshot[]> {
    if (symbols.length === 0) return [];
    const seen = new Set<string>();
    const latest: IndicatorSnapshot[] = [];
    for (const group of chunk(symbols, 80)) {
      const { data, error } = await this.db
        .from('indicator_snapshots')
        .select('*')
        .in('symbol', group)
        .eq('timeframe', '1d')
        .order('as_of', { ascending: false });
      if (error) throw asError(error);
      for (const row of data ?? []) {
        if (seen.has(row.symbol)) continue;
        seen.add(row.symbol);
        latest.push({
          symbol: row.symbol,
          exchange: row.exchange,
          timeframe: row.timeframe,
          asOf: new Date(row.as_of),
          close: Number(row.close),
          volume: Number(row.volume),
          ema20: Number(row.ema20),
          ema50: Number(row.ema50),
          ema200: Number(row.ema200),
          rsi: Number(row.rsi),
          macd: Number(row.macd),
          macdSignal: Number(row.macd_signal),
          macdHistogram: Number(row.macd_histogram),
          atr: Number(row.atr),
          bbUpper: Number(row.bb_upper),
          bbMiddle: Number(row.bb_middle),
          bbLower: Number(row.bb_lower),
          volumeRatio: Number(row.volume_ratio),
          averageVolume20: Number(row.average_volume_20),
        });
      }
    }
    return latest;
  }

  async upsertFiiDii(flow: FiiDiiFlow): Promise<void> {
    const { error } = await this.db.from('fii_dii_data').upsert({
      as_of: flow.asOf.toISOString().slice(0, 10),
      fii_buy: flow.fiiBuy,
      fii_sell: flow.fiiSell,
      fii_net: flow.fiiNet,
      dii_buy: flow.diiBuy,
      dii_sell: flow.diiSell,
      dii_net: flow.diiNet,
    });
    if (error) throw error;
  }

  async latestFiiDii(): Promise<FiiDiiFlow | null> {
    const { data, error } = await this.db
      .from('fii_dii_data')
      .select('*')
      .order('as_of', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      asOf: new Date(data.as_of),
      fiiBuy: Number(data.fii_buy),
      fiiSell: Number(data.fii_sell),
      fiiNet: Number(data.fii_net),
      diiBuy: Number(data.dii_buy),
      diiSell: Number(data.dii_sell),
      diiNet: Number(data.dii_net),
    };
  }

  async insertNews(items: NewsItem[]): Promise<void> {
    if (items.length === 0) return;
    const { error } = await this.db.from('news').insert(
      items.map((item) => ({
        symbol: item.symbol,
        headline: item.headline,
        source: item.source,
        url: item.url,
        published_at: item.publishedAt.toISOString(),
        sentiment: item.sentiment,
        summary: item.summary,
      })),
    );
    if (error) throw error;
  }

  async recentNews(symbol?: string, limit = 20): Promise<NewsItem[]> {
    let query = this.db
      .from('news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (symbol) {
      query = query.eq('symbol', symbol);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      symbol: row.symbol,
      headline: row.headline,
      source: row.source,
      url: row.url,
      publishedAt: new Date(row.published_at),
      sentiment: row.sentiment,
      summary: row.summary,
    }));
  }

  async saveOverview(overview: MarketOverview): Promise<void> {
    const { error } = await this.db.from('market_overviews').upsert({
      as_of: overview.asOf.toISOString(),
      payload: overview,
    });
    if (error) throw error;
  }

  async latestOverview(): Promise<MarketOverview | null> {
    const { data, error } = await this.db
      .from('market_overviews')
      .select('payload')
      .order('as_of', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data?.payload) return null;
    const payload = data.payload as MarketOverview;
    return {
      ...payload,
      asOf: new Date(payload.asOf),
      nifty: { ...payload.nifty, asOf: new Date(payload.nifty.asOf) },
      bankNifty: { ...payload.bankNifty, asOf: new Date(payload.bankNifty.asOf) },
      vix: { ...payload.vix, asOf: new Date(payload.vix.asOf) },
      fiiDii: payload.fiiDii ? { ...payload.fiiDii, asOf: new Date(payload.fiiDii.asOf) } : null,
      gainers: payload.gainers ?? [],
      losers: payload.losers ?? [],
      sectors: payload.sectors ?? [],
    };
  }

  async upsertIpos(issues: IpoIssue[]): Promise<void> {
    if (issues.length === 0) return;
    const { error } = await this.db.from('ipo_issues').upsert(
      issues.map((ipo) => ({
        name: ipo.name,
        symbol: ipo.symbol ?? ipo.name.slice(0, 24),
        open_date: ipo.openDate.toISOString().slice(0, 10),
        close_date: ipo.closeDate.toISOString().slice(0, 10),
        price_band_low: ipo.priceBandLow,
        price_band_high: ipo.priceBandHigh,
        lot_size: ipo.lotSize,
        status: ipo.status,
      })),
      { onConflict: 'symbol,open_date' },
    );
    if (error) throw error;
  }

  async listIpos(): Promise<IpoIssue[]> {
    const { data, error } = await this.db
      .from('ipo_issues')
      .select('*')
      .order('open_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapIpo);
  }

  async getIpo(id: string): Promise<IpoIssue> {
    const { data, error } = await this.db.from('ipo_issues').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('IPO');
    return mapIpo(data as Record<string, unknown>);
  }
}

function mapIpo(row: Record<string, unknown>): IpoIssue {
  return {
    id: String(row.id),
    name: String(row.name),
    symbol: row.symbol ? String(row.symbol) : null,
    openDate: new Date(String(row.open_date)),
    closeDate: new Date(String(row.close_date)),
    priceBandLow: row.price_band_low === null || row.price_band_low === undefined ? null : Number(row.price_band_low),
    priceBandHigh:
      row.price_band_high === null || row.price_band_high === undefined
        ? null
        : Number(row.price_band_high),
    lotSize: row.lot_size === null || row.lot_size === undefined ? null : Number(row.lot_size),
    status: row.status as IpoIssue['status'],
  };
}

function mapInstrument(row: Record<string, unknown>): Instrument {
  return {
    symbol: String(row.symbol),
    exchange: row.exchange as Exchange,
    name: String(row.name),
    isin: row.isin ? String(row.isin) : null,
    sector: row.sector ? String(row.sector) : null,
    industry: row.industry ? String(row.industry) : null,
    marketCap:
      row.market_cap === null || row.market_cap === undefined ? null : Number(row.market_cap),
    lotSize: Number(row.lot_size),
    tickSize: Number(row.tick_size),
    isActive: Boolean(row.is_active),
  };
}
