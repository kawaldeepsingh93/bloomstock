'use client';

import { useMutation } from '@tanstack/react-query';
import { Button, Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import { useState } from 'react';
import { apiPost } from '@/lib/api';
import type { PortfolioAnalysis } from '@bloomstock/core';

export default function PortfolioPage() {
  const [csv, setCsv] = useState('SYMBOL,QTY,AVG\nHDFCBANK,10,1400');
  const analyze = useMutation({
    mutationFn: async () => {
      const holdings = csv
        .trim()
        .split('\n')
        .slice(1)
        .map((line) => {
          const [symbol, quantity, avgPrice] = line.split(',');
          return {
            symbol: symbol?.trim().toUpperCase() ?? '',
            quantity: Number(quantity),
            avgPrice: Number(avgPrice),
            exchange: 'NSE' as const,
          };
        })
        .filter((row) => row.symbol);
      return apiPost<PortfolioAnalysis>('/api/portfolio/analyze', { holdings });
    },
  });
  const data = analyze.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Import holdings</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="h-48 w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs"
          />
          <Button variant="gold" onClick={() => analyze.mutate()}>
            Analyze book
          </Button>
          {analyze.error ? (
            <p className="text-sm text-rose-300">{(analyze.error as Error).message}</p>
          ) : null}
        </CardBody>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
          </CardHeader>
          <CardBody>
            {data ? (
              <ul className="space-y-2 text-sm">
                {data.allocation.map((slice) => (
                  <li key={slice.symbol} className="flex justify-between">
                    <span>{slice.symbol}</span>
                    <span className="font-mono number">
                      {slice.weight}% · {slice.unrealizedPnlPercent}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">
                Import a book to see allocation and trailing stops.
              </p>
            )}
          </CardBody>
        </Card>
        {data?.advice.map((item) => (
          <Card key={item.symbol}>
            <CardBody>
              <p className="font-serif text-xl">{item.symbol}</p>
              <p className="text-sm uppercase tracking-wide text-[#e8c56b]">{item.action}</p>
              <p className="mt-2 text-sm text-zinc-400">{item.rationale}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
