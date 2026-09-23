'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@bloomstock/ui';
import { apiGet, apiPost } from '@/lib/api';
import type { MorningJobStatus } from '@/lib/morning-job';

function tone(state: MorningJobStatus['state']) {
  if (state === 'success') return 'text-[#3ee0a2]';
  if (state === 'failure') return 'text-rose-300';
  if (state === 'running') return 'text-[#e8c56b]';
  return 'text-zinc-500';
}

export function MorningJobButton() {
  const client = useQueryClient();
  const status = useQuery({
    queryKey: ['morning-job'],
    queryFn: () => apiGet<MorningJobStatus>('/api/jobs/morning'),
    refetchInterval: (query) => (query.state.data?.state === 'running' ? 4000 : false),
  });
  const run = useMutation({
    mutationFn: () => apiPost<MorningJobStatus>('/api/jobs/morning', {}),
    onSuccess: (data) => client.setQueryData(['morning-job'], data),
  });
  const current = run.data ?? status.data;

  return (
    <div className="space-y-2">
      <Button
        variant="gold"
        type="button"
        onClick={() => run.mutate()}
        disabled={run.isPending || current?.state === 'running'}
      >
        {current?.state === 'running' || run.isPending ? 'Morning job running…' : 'Run morning ingest'}
      </Button>
      {current ? <p className={`text-sm ${tone(current.state)}`}>{current.message}</p> : null}
      {current?.runUrl ? (
        <a className="block text-xs text-[#e8c56b] hover:underline" href={current.runUrl} target="_blank" rel="noreferrer">
          Open GitHub Action
        </a>
      ) : null}
      {run.error ? <p className="text-sm text-rose-300">{(run.error as Error).message}</p> : null}
    </div>
  );
}
