'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Input, Button } from '@bloomstock/ui';
import { apiGet } from '@/lib/api';
import { isDeskAsk, tickerQuery } from '@/lib/ask-intent';
import type { Instrument } from '@bloomstock/core';

export function AskBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Instrument[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || isDeskAsk(q)) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      apiGet<Instrument[]>(`/api/stocks?q=${encodeURIComponent(q)}`)
        .then((rows) => {
          setHits(rows);
          setOpen(true);
          setError(null);
        })
        .catch((err: Error) => {
          setHits([]);
          setError(err.message);
        });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query]);

  function goStock(symbol: string) {
    setOpen(false);
    router.push(`/stocks/${symbol}`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (isDeskAsk(query)) {
      router.push('/recommendations');
      return;
    }
    const ticker = tickerQuery(query);
    const match =
      hits.find((item) => item.symbol === ticker) ??
      hits.find((item) => item.symbol === query.trim().toUpperCase()) ??
      hits[0];
    if (match) {
      goStock(match.symbol);
      return;
    }
    if (ticker) {
      goStock(ticker);
      return;
    }
    setError('No NSE name matched. Try the ticker, e.g. RELIANCE.');
  }

  return (
    <form onSubmit={onSubmit} className="relative flex gap-2">
      <div className="relative flex-1">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setError(null);
          }}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Search NSE ticker or name — or ask Today's Best Trade"
          aria-label="Search stocks"
          autoComplete="off"
        />
        {open && hits.length > 0 ? (
          <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-white/10 bg-[#10131a] py-1 shadow-xl">
            {hits.slice(0, 8).map((item) => (
              <li key={item.symbol}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5"
                  onClick={() => goStock(item.symbol)}
                >
                  <span className="font-mono text-[#e8c56b]">{item.symbol}</span>
                  <span className="truncate pl-3 text-zinc-400">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="mt-1 text-xs text-rose-300">{error}</p> : null}
      </div>
      <Button variant="gold" type="submit">
        Go
      </Button>
    </form>
  );
}
