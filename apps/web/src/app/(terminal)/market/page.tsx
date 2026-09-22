'use client';

import { useQuery } from '@tanstack/react-query';
import { IndexCard } from '@/components/market/index-card';
import { Heatmap } from '@/components/market/heatmap';
import { TapeList } from '@/components/market/tape-list';
import { Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import { apiGet } from '@/lib/api';

interface OverviewPayload {
  nifty?: { lastPrice: number; changePercent: number } | null;
  bankNifty?: { lastPrice: number; changePercent: number } | null;
  vix?: { lastPrice: number; changePercent: number } | null;
  fiiDii?: { fiiNet: number; diiNet: number } | null;
  asOf?: string | Date | null;
  gainers?: { symbol: string; changePercent: number }[];
  losers?: { symbol: string; changePercent: number }[];
  sectors?: { sector: string; changePercent: number }[];
}

export default function MarketPage() {
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
      <section className="grid gap-4 md:grid-cols-3">
        <IndexCard
          label="Nifty 50"
          price={data?.nifty?.lastPrice ?? null}
          change={data?.nifty?.changePercent ?? null}
          asOf={data?.asOf}
        />
        <IndexCard
          label="Bank Nifty"
          price={data?.bankNifty?.lastPrice ?? null}
          change={data?.bankNifty?.changePercent ?? null}
          asOf={data?.asOf}
        />
        <IndexCard
          label="India VIX"
          price={data?.vix?.lastPrice ?? null}
          change={data?.vix?.changePercent ?? null}
          asOf={data?.asOf}
        />
      </section>
      <Heatmap
        cells={(data?.sectors ?? []).map((sector) => ({
          label: sector.sector,
          change: sector.changePercent,
        }))}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <TapeList title="Top gainers" rows={data?.gainers ?? []} />
        <TapeList title="Top losers" rows={data?.losers ?? []} />
        <Card>
          <CardHeader>
            <CardTitle>Cash market flows</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-zinc-300">
            <p>FII net: {data?.fiiDii?.fiiNet ?? '—'} cr</p>
            <p>DII net: {data?.fiiDii?.diiNet ?? '—'} cr</p>
            <p className="text-zinc-500">
              Figures are ingested from NSE FII/DII reports. Nothing on this page is synthesized.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
