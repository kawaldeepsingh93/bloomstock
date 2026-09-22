'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardBody } from '@bloomstock/ui';
import { RecommendationCard } from '@/components/trade/recommendation-card';
import { DeskStatus } from '@/components/shell/desk-status';
import { apiGet, apiPost } from '@/lib/api';
import type { TodaysTradeResponse } from '@bloomstock/core';

export default function RecommendationsPage() {
  const client = useQueryClient();
  const stored = useQuery({
    queryKey: ['todays-trade'],
    queryFn: () => apiGet<TodaysTradeResponse>('/api/recommendations'),
  });
  const run = useMutation({
    mutationFn: () =>
      apiPost<TodaysTradeResponse>('/api/recommendations', { prompt: 'todays_trade' }),
    onSuccess: (data) => {
      client.setQueryData(['todays-trade'], data);
      client.setQueryData(['session-scan'], data.scan);
    },
  });
  const data = run.data ?? stored.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-3xl">Ask: Today’s Best Trade</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Backend scores setups from stored NSE indicators and ATR. After the close the desk
              uses the last completed session — it does not wait for the next open. OpenAI never
              calculates EMA, RSI, MACD, or position size.
            </p>
            <div className="mt-3">
              <DeskStatus
                scanDate={data?.scan.scanDate}
                stocksScanned={data?.scan.stocksScanned}
                regime={data?.scan.regime}
                tapeAsOf={data?.tapeAsOf}
                message={data?.message}
              />
            </div>
          </div>
          <Button variant="gold" onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? 'Working the tape…' : stored.isFetching ? 'Loading last desk…' : 'Recommend'}
          </Button>
        </CardBody>
      </Card>
      {run.error ? <p className="text-sm text-rose-300">{(run.error as Error).message}</p> : null}
      {stored.error ? <p className="text-sm text-rose-300">{(stored.error as Error).message}</p> : null}
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
