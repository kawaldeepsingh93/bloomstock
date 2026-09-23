'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Input, Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { Profile } from '@bloomstock/core';
import { MorningJobButton } from '@/components/shell/morning-job-button';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SettingsForm() {
  const search = useSearchParams();
  const kiteFlag = search.get('kite');
  const profile = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiGet<Profile>('/api/settings'),
  });
  const kite = useQuery({
    queryKey: ['kite-status'],
    queryFn: () => apiGet<{ connected: boolean }>('/api/kite/status'),
  });
  const [capital, setCapital] = useState('100000');
  const [risk, setRisk] = useState('1');
  useEffect(() => {
    if (!profile.data) return;
    setCapital(String(profile.data.capital));
    setRisk(String(profile.data.riskPercent));
  }, [profile.data]);
  const save = useMutation({
    mutationFn: async () =>
      fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          capital: Number(capital),
          riskPercent: Number(risk),
          notifyEmail: true,
          notifyTelegram: false,
          notifyWhatsapp: false,
        }),
      }),
  });

  return (
    <div className="grid max-w-xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Kite Connect</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-zinc-400">
            {kite.data?.connected
              ? 'A daily access token is sealed in the vendor vault.'
              : 'Connect Kite so the morning worker can download live NSE candles.'}
          </p>
          <a href="/api/kite/login">
            <Button variant="gold" type="button">
              {kite.data?.connected ? 'Reconnect Kite' : 'Connect Kite'}
            </Button>
          </a>
          {kiteFlag === 'connected' ? (
            <p className="text-sm text-[#3ee0a2]">Kite token stored. Run the morning job next.</p>
          ) : null}
          {kiteFlag === 'failed' ? (
            <p className="text-sm text-rose-300">Kite login did not complete. Try again.</p>
          ) : null}
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Morning ingest</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-zinc-400">
            Runs the weekday worker in the background: Kite candles, FII/DII, IPO calendar, scan,
            and the desk note. The page stays usable. Status flips to success or failure when the
            job finishes.
          </p>
          <MorningJobButton />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Risk budget</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <label className="block text-sm text-zinc-400">
            Capital (INR)
            <Input className="mt-1" value={capital} onChange={(e) => setCapital(e.target.value)} />
          </label>
          <label className="block text-sm text-zinc-400">
            Risk percent
            <Input className="mt-1" value={risk} onChange={(e) => setRisk(e.target.value)} />
          </label>
          <Button variant="gold" onClick={() => save.mutate()}>
            Save
          </Button>
          {profile.error ? (
            <p className="text-sm text-zinc-500">
              Sign in with Supabase Auth to persist desk settings.
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading settings…</p>}>
      <SettingsForm />
    </Suspense>
  );
}
