'use client';

import { TradingViewChart } from '@/components/charts/tradingview-widget';
import { Button, Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import type { IndicatorSnapshot, NewsItem, PriceLevels, ResearchBrief } from '@bloomstock/core';
import { formatPrice } from '@bloomstock/shared';

interface StockPayload {
  instrument: { symbol: string; name: string; sector: string | null };
  snapshot: IndicatorSnapshot | null;
  levels: PriceLevels | null;
  news: NewsItem[];
}

export function StockTerminal({ symbol }: { symbol: string }) {
  const stock = useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => apiGet<StockPayload>(`/api/stocks/${symbol}`),
  });
  const research = useMutation({
    mutationFn: () => apiPost<ResearchBrief>(`/api/stocks/${symbol}/research`, {}),
  });
  const data = stock.data;
  const snapshot = data?.snapshot;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            NSE · {data?.instrument.sector ?? 'cash'}
          </p>
          <h2 className="font-serif text-4xl">{data?.instrument.name ?? symbol}</h2>
        </div>
        <Button variant="gold" onClick={() => research.mutate()} disabled={research.isPending}>
          {research.isPending ? 'Researching…' : 'Deep research'}
        </Button>
      </div>
      {stock.error ? <p className="text-sm text-rose-300">{(stock.error as Error).message}</p> : null}
      <TradingViewChart symbol={symbol} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Backend snapshot</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1 text-sm text-zinc-400">
            <p>Close {snapshot ? formatPrice(snapshot.close) : '—'}</p>
            <p>EMA20 {snapshot ? formatPrice(snapshot.ema20) : '—'}</p>
            <p>EMA50 {snapshot ? formatPrice(snapshot.ema50) : '—'}</p>
            <p>RSI {snapshot ? snapshot.rsi.toFixed(1) : '—'}</p>
            <p>MACD {snapshot ? snapshot.macd.toFixed(2) : '—'}</p>
            <p>ATR {snapshot ? formatPrice(snapshot.atr) : '—'}</p>
            <p>Vol ratio {snapshot ? snapshot.volumeRatio.toFixed(2) : '—'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Support / resistance</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1 text-sm text-zinc-400">
            <p>Pivot {data?.levels ? formatPrice(data.levels.pivot) : '—'}</p>
            <p>Support {data?.levels ? formatPrice(data.levels.support) : '—'}</p>
            <p>Resistance {data?.levels ? formatPrice(data.levels.resistance) : '—'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invalidation</CardTitle>
          </CardHeader>
          <CardBody className="text-sm text-zinc-400">
            Swing thesis dies on a close back through EMA50 or the ATR stop. Indicator values come
            from `indicator_snapshots`, never from the model.
          </CardBody>
        </Card>
      </div>
      {research.error ? (
        <p className="text-sm text-rose-300">{(research.error as Error).message}</p>
      ) : null}
      {research.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Research brief</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-zinc-300">
            <p className="font-serif text-xl text-white">{research.data.thesis}</p>
            <p>{research.data.briefing}</p>
            <p className="text-zinc-500">Invalidation: {research.data.invalidation}</p>
            <ul className="list-disc pl-4 text-zinc-400">
              {research.data.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
