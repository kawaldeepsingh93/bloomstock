export type Exchange = 'NSE' | 'BSE';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '1d' | '1w';
export type MarketRegime = 'bullish' | 'neutral' | 'bearish';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface Instrument {
  symbol: string;
  exchange: Exchange;
  name: string;
  isin: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  lotSize: number;
  tickSize: number;
  isActive: boolean;
}

export interface Candle {
  symbol: string;
  exchange: Exchange;
  timeframe: Timeframe;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  exchange: Exchange;
  lastPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePercent: number;
  asOf: Date;
}

export interface IndexSnapshot {
  symbol: 'NIFTY 50' | 'NIFTY BANK' | 'INDIA VIX';
  lastPrice: number;
  changePercent: number;
  asOf: Date;
}

export interface FiiDiiFlow {
  asOf: Date;
  fiiBuy: number;
  fiiSell: number;
  fiiNet: number;
  diiBuy: number;
  diiSell: number;
  diiNet: number;
}

export interface MarketOverview {
  nifty: IndexSnapshot;
  bankNifty: IndexSnapshot;
  vix: IndexSnapshot;
  fiiDii: FiiDiiFlow | null;
  regime: MarketRegime;
  asOf: Date;
  gainers: Quote[];
  losers: Quote[];
  sectors: SectorPerformance[];
}

export interface NewsItem {
  id: string;
  symbol: string | null;
  headline: string;
  source: string;
  url: string | null;
  publishedAt: Date;
  sentiment: Sentiment | null;
  summary: string | null;
}

export interface IndicatorSnapshot {
  symbol: string;
  exchange: Exchange;
  timeframe: Timeframe;
  asOf: Date;
  close: number;
  volume: number;
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  atr: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  volumeRatio: number;
  averageVolume20: number;
}

export interface SectorPerformance {
  sector: string;
  changePercent: number;
  advancing: number;
  declining: number;
}
