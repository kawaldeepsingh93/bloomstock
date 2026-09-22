'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input } from '@bloomstock/ui';
import { useState } from 'react';

export default function WatchlistPage() {
  const client = useQueryClient();
  const [symbol, setSymbol] = useState('');
  const watchlist = useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => (await fetch('/api/watchlist')).json(),
  });
  const add = useMutation({
    mutationFn: async () =>
      fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symbol, exchange: 'NSE' }),
      }),
    onSuccess: () => {
      setSymbol('');
      client.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
  const symbols: string[] = watchlist.data?.data?.symbols ?? [];

  return (
    <div className="space-y-5">
      <div className="flex max-w-lg gap-2">
        <Input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Add NSE symbol"
        />
        <Button variant="gold" onClick={() => add.mutate()} disabled={!symbol}>
          Add
        </Button>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {symbols.map((item) => (
          <li key={item} className="rounded-2xl border border-white/8 bg-[#10131a] px-4 py-4">
            <p className="font-serif text-xl">{item}</p>
            <button
              className="mt-2 text-xs text-rose-300"
              onClick={() =>
                fetch('/api/watchlist', {
                  method: 'DELETE',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ symbol: item, exchange: 'NSE' }),
                }).then(() => client.invalidateQueries({ queryKey: ['watchlist'] }))
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {symbols.length === 0 ? (
        <p className="text-sm text-zinc-500">Your default watchlist is empty.</p>
      ) : null}
    </div>
  );
}
