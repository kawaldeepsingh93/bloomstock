export interface TapeQuote {
  symbol?: string;
  lastPrice?: number | null;
  changePercent?: number | null;
}

export interface OverviewTape {
  nifty?: TapeQuote | null;
  bankNifty?: TapeQuote | null;
  vix?: TapeQuote | null;
  gainers?: TapeQuote[];
  losers?: TapeQuote[];
}

export interface TapeItem {
  symbol: string;
  label: string;
  lastPrice: number;
  changePercent: number;
  href: string;
}

const INDEX_ROWS = [
  { key: 'nifty' as const, symbol: 'NIFTY', label: 'NIFTY 50' },
  { key: 'bankNifty' as const, symbol: 'BANKNIFTY', label: 'BANK NIFTY' },
  { key: 'vix' as const, symbol: 'INDIAVIX', label: 'INDIA VIX' },
];

function isLiveQuote(
  quote?: TapeQuote | null,
): quote is TapeQuote & { lastPrice: number; changePercent: number } {
  return (
    typeof quote?.lastPrice === 'number' &&
    Number.isFinite(quote.lastPrice) &&
    typeof quote.changePercent === 'number' &&
    Number.isFinite(quote.changePercent)
  );
}

export function buildTapeItems(overview?: OverviewTape | null): TapeItem[] {
  const seen = new Set<string>();
  const items: TapeItem[] = [];

  function add(item: TapeItem) {
    const key = item.symbol.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  }

  for (const row of INDEX_ROWS) {
    const quote = overview?.[row.key];
    if (!isLiveQuote(quote)) continue;
    add({
      symbol: row.symbol,
      label: row.label,
      lastPrice: quote.lastPrice,
      changePercent: quote.changePercent,
      href: '/market',
    });
  }

  for (const quote of [...(overview?.gainers ?? []), ...(overview?.losers ?? [])]) {
    if (!quote.symbol || !isLiveQuote(quote)) continue;
    add({
      symbol: quote.symbol,
      label: quote.symbol,
      lastPrice: quote.lastPrice,
      changePercent: quote.changePercent,
      href: `/stocks/${encodeURIComponent(quote.symbol)}`,
    });
  }

  return items;
}

export function marqueeDurationSeconds(itemCount: number): number {
  return Math.min(120, Math.max(70, itemCount * 5));
}
