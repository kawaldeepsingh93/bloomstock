import type { Candle, Exchange, Instrument, Quote, Timeframe } from '@bloomstock/core';
import { ConfigurationError, MarketDataError } from '@bloomstock/core';
import type { MarketDataProvider } from './ports';

const BASE_URL = 'https://www.alphavantage.co/query';

export class AlphaVantageProvider implements MarketDataProvider {
  readonly name = 'alpha-vantage';

  constructor(private readonly apiKey = process.env.ALPHA_VANTAGE_API_KEY) {
    if (!apiKey) {
      throw new ConfigurationError('ALPHA_VANTAGE_API_KEY is required');
    }
  }

  async getQuote(symbol: string, exchange: Exchange): Promise<Quote> {
    const ticker = toAvSymbol(symbol, exchange);
    const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${this.apiKey}`;
    const json = await getJson(url, this.name);
    const quote = json['Global Quote'] as Record<string, string> | undefined;
    if (!quote || !quote['05. price']) {
      throw new MarketDataError(this.name, `No global quote for ${ticker}`);
    }
    const asOfRaw = quote['07. latest trading day'];
    if (!asOfRaw) {
      throw new MarketDataError(this.name, `Quote for ${ticker} is missing a trading day`);
    }
    return {
      symbol,
      exchange,
      lastPrice: Number(quote['05. price']),
      open: Number(quote['02. open']),
      high: Number(quote['03. high']),
      low: Number(quote['04. low']),
      close: Number(quote['08. previous close']),
      volume: Number(quote['06. volume']),
      changePercent: Number(String(quote['10. change percent'] ?? '0').replace('%', '')),
      asOf: new Date(asOfRaw),
    };
  }

  async getQuotes(symbols: string[], exchange: Exchange): Promise<Quote[]> {
    const quotes: Quote[] = [];
    for (const symbol of symbols) {
      quotes.push(await this.getQuote(symbol, exchange));
    }
    return quotes;
  }

  async getHistorical(
    symbol: string,
    exchange: Exchange,
    timeframe: Timeframe,
    from: Date,
    to: Date,
  ): Promise<Candle[]> {
    if (timeframe !== '1d') {
      throw new MarketDataError(this.name, 'Alpha Vantage adapter only serves daily candles');
    }
    const ticker = toAvSymbol(symbol, exchange);
    const url = `${BASE_URL}?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(ticker)}&outputsize=full&apikey=${this.apiKey}`;
    const json = await getJson(url, this.name);
    const series = json['Time Series (Daily)'] as
      Record<string, Record<string, string>> | undefined;
    if (!series) {
      throw new MarketDataError(this.name, `No daily series for ${ticker}`);
    }
    return Object.entries(series)
      .map(([day, row]) => ({
        symbol,
        exchange,
        timeframe,
        timestamp: new Date(`${day}T00:00:00Z`),
        open: Number(row['1. open']),
        high: Number(row['2. high']),
        low: Number(row['3. low']),
        close: Number(row['4. close']),
        volume: Number(row['6. volume']),
      }))
      .filter((candle) => candle.timestamp >= from && candle.timestamp <= to)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async listEquityUniverse(_exchange: Exchange): Promise<Instrument[]> {
    throw new MarketDataError(
      this.name,
      'Alpha Vantage cannot list the NSE cash universe. Use Kite Connect for instrument master.',
    );
  }
}

function toAvSymbol(symbol: string, exchange: Exchange): string {
  if (symbol.includes('.')) return symbol;
  return `${symbol}.${exchange}`;
}

async function getJson(url: string, provider: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new MarketDataError(provider, `HTTP ${response.status}`);
  }
  const json = (await response.json()) as Record<string, unknown>;
  if (json['Note'] || json['Error Message'] || json['Information']) {
    throw new MarketDataError(
      provider,
      String(json['Note'] ?? json['Error Message'] ?? json['Information']),
    );
  }
  return json;
}
