import type { Candle, Exchange, Instrument, Quote, Timeframe } from '@bloomstock/core';
import { ConfigurationError, MarketDataError, sanitizeInstrumentLots } from '@bloomstock/core';
import { KiteConnect } from 'kiteconnect';
import type { IndexProvider, MarketDataProvider } from './ports';
import {
  instrumentKey,
  isNseCashEquity,
  kiteErrorMessage,
  type KiteInstrumentRow,
} from './kite-instruments';

const INDEX_TOKENS = {
  nifty: 'NSE:NIFTY 50',
  bankNifty: 'NSE:NIFTY BANK',
  vix: 'NSE:INDIA VIX',
} as const;

export class KiteMarketDataProvider implements MarketDataProvider, IndexProvider {
  readonly name = 'kite';
  private readonly client: InstanceType<typeof KiteConnect>;
  private readonly tokens = new Map<string, number>();

  constructor(apiKey = process.env.KITE_API_KEY, accessToken = process.env.KITE_ACCESS_TOKEN) {
    if (!apiKey || !accessToken) {
      throw new ConfigurationError(
        'KITE_API_KEY and KITE_ACCESS_TOKEN are required for live market data',
      );
    }
    this.client = new KiteConnect({ api_key: apiKey });
    this.client.setAccessToken(accessToken);
  }

  async getQuote(symbol: string, exchange: Exchange): Promise<Quote> {
    const quotes = await this.getQuotes([symbol], exchange);
    const quote = quotes[0];
    if (!quote) {
      throw new MarketDataError(this.name, `No quote for ${exchange}:${symbol}`);
    }
    return quote;
  }

  async getQuotes(symbols: string[], exchange: Exchange): Promise<Quote[]> {
    try {
      const keys = symbols.map((symbol) => `${exchange}:${symbol}`);
      const payload = (await this.client.getQuote(keys)) as Record<string, KiteQuote>;
      return Object.entries(payload).map(([key, item]) => ({
        ...toQuote(item, exchange),
        symbol: key.split(':')[1] ?? '',
      }));
    } catch (error) {
      throw wrap(this.name, error);
    }
  }

  async getHistorical(
    symbol: string,
    exchange: Exchange,
    timeframe: Timeframe,
    from: Date,
    to: Date,
  ): Promise<Candle[]> {
    try {
      const token = await this.instrumentToken(symbol, exchange);
      const rows = await this.client.getHistoricalData(
        token,
        mapTimeframe(timeframe),
        from,
        to,
        false,
      );
      return rows.map((row) => ({
        symbol,
        exchange,
        timeframe,
        timestamp: new Date(row.date),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
      }));
    } catch (error) {
      throw wrap(this.name, error);
    }
  }

  async listEquityUniverse(exchange: Exchange): Promise<Instrument[]> {
    try {
      const instruments = (await this.client.getInstruments(exchange)) as unknown as KiteInstrumentRow[];
      const equities = instruments.filter(isNseCashEquity);
      for (const item of equities) {
        this.tokens.set(instrumentKey(exchange, item.tradingsymbol), Number(item.instrument_token));
      }
      return equities.map((item) => {
        const lots = sanitizeInstrumentLots(Number(item.lot_size), Number(item.tick_size));
        return {
          symbol: item.tradingsymbol,
          exchange,
          name: item.name,
          isin: null,
          sector: null,
          industry: null,
          marketCap: null,
          lotSize: lots.lotSize,
          tickSize: lots.tickSize,
          isActive: true,
        };
      });
    } catch (error) {
      throw wrap(this.name, error);
    }
  }

  async getNifty(): Promise<Quote> {
    return this.quoteIndex(INDEX_TOKENS.nifty);
  }

  async getBankNifty(): Promise<Quote> {
    return this.quoteIndex(INDEX_TOKENS.bankNifty);
  }

  async getIndiaVix(): Promise<Quote> {
    return this.quoteIndex(INDEX_TOKENS.vix);
  }

  private async instrumentToken(symbol: string, exchange: Exchange): Promise<number> {
    const key = instrumentKey(exchange, symbol);
    const cached = this.tokens.get(key);
    if (cached) return cached;
    const payload = (await this.client.getQuote([key])) as Record<string, KiteQuote>;
    const instrument = payload[key];
    if (!instrument) {
      throw new MarketDataError(this.name, `Unknown instrument ${key}`);
    }
    this.tokens.set(key, instrument.instrument_token);
    return instrument.instrument_token;
  }

  private async quoteIndex(key: string): Promise<Quote> {
    try {
      const payload = (await this.client.getQuote([key])) as Record<string, KiteQuote>;
      const item = payload[key];
      if (!item) {
        throw new MarketDataError(this.name, `Missing index quote ${key}`);
      }
      return { ...toQuote(item, 'NSE'), symbol: key.split(':')[1] ?? key };
    } catch (error) {
      throw wrap(this.name, error);
    }
  }
}

interface KiteQuote {
  instrument_token: number;
  last_price: number;
  ohlc: { open: number; high: number; low: number; close: number };
  volume: number;
  change?: number;
  timestamp?: string;
}

function toQuote(item: KiteQuote, exchange: Exchange): Quote {
  const close = item.ohlc.close || item.last_price;
  const changePercent = close === 0 ? 0 : ((item.last_price - close) / close) * 100;
  return {
    symbol: '',
    exchange,
    lastPrice: item.last_price,
    open: item.ohlc.open,
    high: item.ohlc.high,
    low: item.ohlc.low,
    close,
    volume: item.volume,
    changePercent: Number(changePercent.toFixed(2)),
    asOf: item.timestamp ? new Date(item.timestamp) : new Date(),
  };
}

function mapTimeframe(
  timeframe: Timeframe,
): 'minute' | '5minute' | '15minute' | '60minute' | 'day' {
  const map: Record<Timeframe, 'minute' | '5minute' | '15minute' | '60minute' | 'day'> = {
    '1m': 'minute',
    '5m': '5minute',
    '15m': '15minute',
    '1h': '60minute',
    '1d': 'day',
    '1w': 'day',
  };
  return map[timeframe];
}

function wrap(provider: string, error: unknown): MarketDataError {
  if (error instanceof MarketDataError) return error;
  return new MarketDataError(provider, kiteErrorMessage(error));
}
