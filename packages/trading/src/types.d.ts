declare module 'technicalindicators' {
  export const EMA: { calculate: (input: { period: number; values: number[] }) => number[] };
  export const SMA: { calculate: (input: { period: number; values: number[] }) => number[] };
  export const RSI: { calculate: (input: { period: number; values: number[] }) => number[] };
  export const ATR: {
    calculate: (input: {
      high: number[];
      low: number[];
      close: number[];
      period: number;
    }) => number[];
  };
  export const MACD: {
    calculate: (input: {
      values: number[];
      fastPeriod: number;
      slowPeriod: number;
      signalPeriod: number;
      SimpleMAOscillator: boolean;
      SimpleMASignal: boolean;
    }) => { MACD?: number; signal?: number; histogram?: number }[];
  };
  export const BollingerBands: {
    calculate: (input: {
      period: number;
      values: number[];
      stdDev: number;
    }) => { upper: number; middle: number; lower: number }[];
  };
}
