'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatPercent, formatPrice } from '@bloomstock/shared';
import { cn } from '@bloomstock/ui';
import { apiGet } from '@/lib/api';
import { buildTapeItems, marqueeDurationSeconds, type OverviewTape, type TapeItem } from '@/lib/stock-tape';

function changeClass(change: number) {
  if (change > 0) return 'text-[#3ee0a2]';
  if (change < 0) return 'text-[#ff6b8a]';
  return 'text-zinc-400';
}

function TapeChip({ item }: { item: TapeItem }) {
  return (
    <Link
      href={item.href}
      className="flex shrink-0 items-center gap-2 whitespace-nowrap px-5 py-1 text-[11px] tracking-wide text-[color:var(--text)] hover:text-[#d4a017]"
    >
      <span className="font-medium">{item.label}</span>
      <span className="font-mono number text-zinc-400">{formatPrice(item.lastPrice)}</span>
      <span className={cn('font-mono number', changeClass(item.changePercent))}>
        {formatPercent(item.changePercent)}
      </span>
    </Link>
  );
}

function TapeCopy({ items, hidden }: { items: TapeItem[]; hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <TapeChip key={`${hidden ? 'dup' : 'live'}-${item.symbol}`} item={item} />
      ))}
    </div>
  );
}

export function StockMarquee() {
  const overview = useQuery({
    queryKey: ['overview'],
    queryFn: async (): Promise<OverviewTape> => {
      try {
        return await apiGet<OverviewTape>('/api/market/overview');
      } catch {
        return {};
      }
    },
    staleTime: 30_000,
  });

  const items = buildTapeItems(overview.data);
  const duration = marqueeDurationSeconds(items.length);

  return (
    <div
      aria-label="Live stock tape"
      className="relative z-30 h-9 overflow-hidden border-b border-[color:var(--border)] bg-[var(--panel)]"
    >
      {items.length === 0 ? (
        <p className="flex h-full items-center px-4 text-[11px] tracking-wide text-zinc-500">
          Awaiting live NSE quotes — nothing on this tape is estimated.
        </p>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[var(--panel)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--panel)] to-transparent" />
          <div className="bloom-marquee-track" style={{ animationDuration: `${duration}s` }}>
            <TapeCopy items={items} />
            <TapeCopy items={items} hidden />
          </div>
        </>
      )}
    </div>
  );
}
