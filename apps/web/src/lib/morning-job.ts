export type MorningJobState = 'idle' | 'running' | 'success' | 'failure';
export type MorningJobMode = 'local' | 'github';

export interface MorningJobStatus {
  state: MorningJobState;
  mode: MorningJobMode | null;
  startedAt: string | null;
  finishedAt: string | null;
  message: string | null;
  runId: number | null;
  runUrl: string | null;
}

export function idleMorningStatus(): MorningJobStatus {
  return {
    state: 'idle',
    mode: null,
    startedAt: null,
    finishedAt: null,
    message: null,
    runId: null,
    runUrl: null,
  };
}

export function morningStateFromGithub(conclusion: string | null, status: string): MorningJobState {
  if (status === 'queued' || status === 'in_progress' || status === 'waiting' || status === 'requested') {
    return 'running';
  }
  if (conclusion === 'success') return 'success';
  if (conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'cancelled') return 'failure';
  return 'running';
}

export function morningStatusMessage(state: MorningJobState, mode: MorningJobMode | null): string {
  if (state === 'running') {
    return mode === 'github'
      ? 'Morning ingest is running on GitHub Actions.'
      : 'Morning ingest is running in the background.';
  }
  if (state === 'success') return 'Morning ingest finished. Tape and scan are stored.';
  if (state === 'failure') return 'Morning ingest failed. Check Kite, Supabase, and the job log.';
  return 'No morning ingest is running.';
}
