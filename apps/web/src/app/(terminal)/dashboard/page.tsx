'use client';

import { useQuery } from '@tanstack/react-query';
import { IndexCard } from '@/components/market/index-card';
import { Heatmap } from '@/components/market/heatmap';
import { TapeList } from '@/components/market/tape-list';
import { Button, Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface OverviewPayload {
  nifty?: { lastPrice: number; changePercent: number } | null;
  bankNifty?: { lastPrice: number; changePercent: number } | null;
  vix?: { lastPrice: number; changePercent: number } | null;
  fiiDii?: { fiiNet: number; diiNet: number } | null;
  regime?: string | null;
  message?: string;
  gainers?: { symbol: string; changePercent: number }[];
  losers?: { symbol: string; changePercent: number }[];
  sectors?: { sector: string; changePercent: number }[];
}

export default function DashboardPage() {
  const overview = useQuery({
    queryKey: ['overview'],
    queryFn: async (): Promise<OverviewPayload> => {
      try {
        return await apiGet<OverviewPayload>('/api/market/overview');
      } catch {
        return {};
      }
    },
  });
  const data = overview.data;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IndexCard
          label="Nifty 50"
          price={data?.nifty?.lastPrice ?? null}
          change={data?.nifty?.changePercent ?? null}
        />
        <IndexCard
          label="Bank Nifty"
          price={data?.bankNifty?.lastPrice ?? null}
          change={data?.bankNifty?.changePercent ?? null}
        />
        <IndexCard
          label="India VIX"
          price={data?.vix?.lastPrice ?? null}
          change={data?.vix?.changePercent ?? null}
        />
        <Card>
          <CardHeader>
            <CardTitle>FII / DII</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="font-mono text-2xl number">
              {data?.fiiDii ? `${data.fiiDii.fiiNet.toFixed(0)} cr` : '—'}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {data?.regime ? `Regime ${data.regime}` : 'Awaiting cash-market flow print'}
            </p>
          </CardBody>
        </Card>
      </section>

      <Heatmap
        cells={(data?.sectors ?? []).map((sector) => ({
          label: sector.sector,
          change: sector.changePercent,
        }))}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <TapeList title="Top gainers" rows={data?.gainers ?? []} />
        <TapeList title="Top losers" rows={data?.losers ?? []} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Desk prompt</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-3xl text-white">Today’s Best Trade</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              Opens the desk note from the stored morning scan. It does not ingest candles —
              that is the worker at 09:10 IST.
              {data?.message ? ` ${data.message}` : ''}
            </p>
          </div>
          <Link href="/recommendations">
            <Button variant="gold">Today’s Best Trade</Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
