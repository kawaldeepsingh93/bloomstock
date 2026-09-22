'use client';

import { useMutation } from '@tanstack/react-query';
import { Button, Card, CardBody } from '@bloomstock/ui';
import { RecommendationCard } from '@/components/trade/recommendation-card';
import { apiPost } from '@/lib/api';
import type { TodaysTradeResponse } from '@bloomstock/core';

export default function RecommendationsPage() {
  const run = useMutation({
    mutationFn: () =>
      apiPost<TodaysTradeResponse>('/api/recommendations', { prompt: 'todays_trade' }),
  });
  const data = run.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-3xl">Ask: Today’s Best Trade</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Backend scores setups from stored NSE indicators and ATR. A strong day is a
              watch — buy the dip or a stop-buy through the high — not a market buy at the
              close. OpenAI never calculates EMA, RSI, MACD, or position size.
            </p>
          </div>
          <Button variant="gold" onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? 'Working the tape…' : 'Recommend'}
          </Button>
        </CardBody>
      </Card>
      {run.error ? <p className="text-sm text-rose-300">{(run.error as Error).message}</p> : null}
      {data?.noTrade ? (
        <Card>
          <CardBody>
            <p className="font-serif text-2xl">No Trade Today</p>
            <p className="mt-2 text-zinc-400">{data.message}</p>
          </CardBody>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {data?.recommendations.map((item) => (
          <RecommendationCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
