'use client';

import { useQuery } from '@tanstack/react-query';
import { IndexCard } from '@/components/market/index-card';
import { Heatmap } from '@/components/market/heatmap';
import { TapeList } from '@/components/market/tape-list';
import { Button, Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { DeskStatus } from '@/components/shell/desk-status';
import { MorningJobButton } from '@/components/shell/morning-job-button';
import type { DailyScanSummary } from '@bloomstock/core';

interface OverviewPayload {
  nifty?: { lastPrice: number; changePercent: number } | null;
  bankNifty?: { lastPrice: number; changePercent: number } | null;
  vix?: { lastPrice: number; changePercent: number } | null;
  fiiDii?: { fiiNet: number; diiNet: number } | null;
  regime?: string | null;
  message?: string;
  asOf?: string | Date | null;
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
  const lastScan = useQuery({
    queryKey: ['session-scan'],
    queryFn: async (): Promise<DailyScanSummary | null> => {
      try {
        return await apiGet<DailyScanSummary | null>('/api/scan');
      } catch {
        return null;
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <DeskStatus
          scanDate={lastScan.data?.scanDate}
          stocksScanned={lastScan.data?.stocksScanned}
          regime={lastScan.data?.regime ?? data?.regime}
          tapeAsOf={data?.asOf ? String(data.asOf) : null}
          message={lastScan.data?.noTradeReason ?? data?.message}
        />
        <MorningJobButton />
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        <Card>
          <CardHeader>
            <CardTitle>FII / DII</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="font-mono text-2xl number">
              {data?.fiiDii ? `${data.fiiDii.fiiNet.toFixed(0)} cr` : '—'}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {data?.regime
                ? `Regime ${data.regime}`
                : data?.fiiDii
                  ? 'Flows from last NSE FII/DII print'
                  : 'No FII/DII print stored yet'}
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
              Opens the last stored desk note. After the close it scores that session — it does
              not wait for the next open.
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
