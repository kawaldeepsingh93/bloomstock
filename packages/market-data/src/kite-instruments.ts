export interface KiteInstrumentRow {
  tradingsymbol: string;
  name: string;
  instrument_token: number;
  instrument_type: string;
  segment: string;
  exchange: string;
  lot_size: number;
  tick_size: number;
}

const NON_CASH_SERIES = /-(SM|BE|ST|SZ|SG|GS|TB|BZ|IL|PP|RE|N\d|Y\d|W\d|IV)$/;

export function isNseCashEquity(item: KiteInstrumentRow): boolean {
  return (
    item.exchange === 'NSE' &&
    item.segment === 'NSE' &&
    item.instrument_type === 'EQ' &&
    /^[A-Z]/i.test(item.tradingsymbol) &&
    !item.tradingsymbol.includes(' ') &&
    !NON_CASH_SERIES.test(item.tradingsymbol)
  );
}

export function kiteErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message && error.message !== 'Unknown market data failure') {
    return error.message;
  }
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.error_type, record.status]
      .filter((part) => part !== undefined && part !== null && String(part).length > 0)
      .map(String);
    if (parts.length > 0) return parts.join(' ');
  }
  return 'Unknown market data failure';
}

export function instrumentKey(exchange: string, symbol: string): string {
  return `${exchange}:${symbol}`;
}
