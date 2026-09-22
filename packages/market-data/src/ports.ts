import type { Candle, Exchange, Instrument, Quote, Timeframe } from '@bloomstock/core';

export interface MarketDataProvider {
  name: string;
  getQuote(symbol: string, exchange: Exchange): Promise<Quote>;
  getQuotes(symbols: string[], exchange: Exchange): Promise<Quote[]>;
  getHistorical(
    symbol: string,
    exchange: Exchange,
    timeframe: Timeframe,
    from: Date,
    to: Date,
  ): Promise<Candle[]>;
  listEquityUniverse(exchange: Exchange): Promise<Instrument[]>;
}

export interface IndexProvider {
  getNifty(): Promise<Quote>;
  getBankNifty(): Promise<Quote>;
  getIndiaVix(): Promise<Quote>;
}
