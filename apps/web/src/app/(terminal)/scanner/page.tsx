'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Input } from '@bloomstock/ui';
import { ScannerTable } from '@/components/scanner/scanner-table';
import { useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import type { DailyScanSummary, SetupType } from '@bloomstock/core';

export default function ScannerPage() {
  const [rsiMin, setRsiMin] = useState('55');
  const [rsiMax, setRsiMax] = useState('70');
  const [volume, setVolume] = useState('1.5');
  const [sector, setSector] = useState('');
  const [pattern, setPattern] = useState<SetupType | ''>('');
  const [breakoutOnly, setBreakoutOnly] = useState(false);
  const [name, setName] = useState('Momentum breakout');

  function filters() {
    return {
      rsiMin: Number(rsiMin),
      rsiMax: Number(rsiMax),
      volumeRatioMin: Number(volume),
      aboveEma20: true,
      aboveEma50: true,
      sectors: sector ? [sector] : undefined,
      pattern: pattern || undefined,
      breakoutOnly: breakoutOnly || undefined,
    };
  }

  const scan = useMutation({
    mutationFn: () => apiPost<DailyScanSummary>('/api/scan', { limit: 25, filters: filters() }),
  });
  const saved = useQuery({
    queryKey: ['saved-scans'],
    queryFn: () => apiGet<{ name: string }[]>('/api/scans/saved'),
  });
  const save = useMutation({
    mutationFn: () => apiPost('/api/scans/saved', { name, filters: filters() }),
    onSuccess: () => saved.refetch(),
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Input value={rsiMin} onChange={(e) => setRsiMin(e.target.value)} placeholder="RSI min" />
        <Input value={rsiMax} onChange={(e) => setRsiMax(e.target.value)} placeholder="RSI max" />
        <Input
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          placeholder="Volume ratio"
        />
        <Input
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          placeholder="Sector (Banks)"
        />
        <select
          value={pattern}
          onChange={(e) => setPattern(e.target.value as SetupType | '')}
          className="h-10 rounded-lg border border-[color:var(--border)] bg-black/20 px-3 text-sm"
        >
          <option value="">Any pattern</option>
          <option value="breakout">Breakout</option>
          <option value="cup_handle">Cup and handle</option>
          <option value="flag">Flag</option>
          <option value="ascending_triangle">Ascending triangle</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={breakoutOnly}
            onChange={(e) => setBreakoutOnly(e.target.checked)}
          />
          Breakouts only
        </label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Save as" />
        <div className="flex gap-2">
          <Button variant="gold" onClick={() => scan.mutate()} disabled={scan.isPending}>
            {scan.isPending ? 'Scanning…' : 'Run scan'}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
      {scan.error ? <p className="text-sm text-rose-300">{(scan.error as Error).message}</p> : null}
      {save.error ? <p className="text-sm text-rose-300">{(save.error as Error).message}</p> : null}
      <ScannerTable rows={scan.data?.candidates ?? []} />
      <p className="text-xs text-zinc-500">
        Saved scans: {saved.data?.map((item) => item.name).join(', ') || 'none yet'}
      </p>
    </div>
  );
}
