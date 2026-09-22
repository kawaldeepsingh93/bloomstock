'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import { apiGet, apiPost } from '@/lib/api';
import { formatIstDate, formatPrice } from '@bloomstock/shared';
import type { IpoAnalysis, IpoBookReview, IpoIssue } from '@bloomstock/core';

const verdictClass: Record<IpoAnalysis['verdict'], string> = {
  subscribe: 'text-emerald-300',
  wait: 'text-[#e8c56b]',
  avoid: 'text-rose-300',
};

export default function IpoPage() {
  const client = useQueryClient();
  const ipos = useQuery({
    queryKey: ['ipo'],
    queryFn: () => apiGet<IpoIssue[]>('/api/ipo'),
  });
  const sync = useMutation({
    mutationFn: () => apiPost<{ count: number; issues: IpoIssue[] }>('/api/ipo/sync', {}),
    onSuccess: (data) => {
      client.setQueryData(['ipo'], data.issues);
    },
  });
  const reviewBook = useMutation({
    mutationFn: () => apiPost<IpoBookReview>('/api/ipo/analyze', {}),
  });
  const rows = ipos.data ?? [];
  const notes = new Map(
    (reviewBook.data?.reviews ?? []).map((item) => [item.ipo.id, item.analysis]),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-3xl">IPO book</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Current and forthcoming NSE issues only. Dates and bands come from the exchange
              calendar — missing fields stay blank.
            </p>
            {reviewBook.data ? (
              <p className="mt-3 text-sm text-zinc-300">{reviewBook.data.headline}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? 'Syncing NSE…' : 'Sync NSE IPOs'}
            </Button>
            <Button
              variant="gold"
              onClick={() => reviewBook.mutate()}
              disabled={reviewBook.isPending || rows.length === 0}
            >
              {reviewBook.isPending ? 'Reviewing the book…' : 'Review all IPOs'}
            </Button>
          </div>
        </CardBody>
      </Card>
      {reviewBook.data ? (
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <Count label="Subscribe" value={reviewBook.data.subscribe} className="text-emerald-300" />
          <Count label="Wait" value={reviewBook.data.wait} className="text-[#e8c56b]" />
          <Count label="Avoid" value={reviewBook.data.avoid} className="text-rose-300" />
        </div>
      ) : null}
      {sync.data ? (
        <p className="text-sm text-zinc-400">Ingested {sync.data.count} NSE issues.</p>
      ) : null}
      {sync.error ? <p className="text-sm text-rose-300">{(sync.error as Error).message}</p> : null}
      {ipos.error ? <p className="text-sm text-rose-300">{(ipos.error as Error).message}</p> : null}
      {reviewBook.error ? (
        <p className="text-sm text-rose-300">{(reviewBook.error as Error).message}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {rows.length === 0 ? (
          <Card>
            <CardBody className="text-sm text-zinc-400">
              No current or forthcoming NSE issues in the book. Sync from NSE — nothing is mocked.
            </CardBody>
          </Card>
        ) : (
          rows.map((ipo) => {
            const analysis = notes.get(ipo.id);
            const band =
              ipo.priceBandLow != null && ipo.priceBandHigh != null
                ? `${formatPrice(ipo.priceBandLow)}–${formatPrice(ipo.priceBandHigh)}`
                : 'Band not published';
            return (
              <Card key={ipo.id}>
                <CardHeader>
                  <CardTitle>{ipo.name}</CardTitle>
                </CardHeader>
                <CardBody className="space-y-3">
                  <p className="text-sm text-zinc-400">
                    {ipo.status} · {ipo.symbol ?? '—'} · {band}
                    {ipo.lotSize ? ` · lot ${ipo.lotSize}` : ''}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Opens {formatIstDate(new Date(ipo.openDate))} · closes{' '}
                    {formatIstDate(new Date(ipo.closeDate))}
                  </p>
                  {analysis ? (
                    <div className="text-sm">
                      <p className={`uppercase tracking-wide ${verdictClass[analysis.verdict]}`}>
                        {analysis.verdict}
                      </p>
                      <p className="mt-2 text-zinc-400">{analysis.rationale}</p>
                      <ul className="mt-2 list-disc pl-4 text-zinc-500">
                        {analysis.risks.map((risk) => (
                          <li key={risk}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No desk note yet — review the book.</p>
                  )}
                </CardBody>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function Count({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
        <p className={`mt-1 font-serif text-3xl ${className}`}>{value}</p>
      </CardBody>
    </Card>
  );
}
