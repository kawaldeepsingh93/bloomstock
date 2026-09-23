import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { envValue } from '@bloomstock/core';
import { getContainer } from '@/server/container';
import {
  idleMorningStatus,
  morningStateFromGithub,
  morningStatusMessage,
  type MorningJobStatus,
} from '@/lib/morning-job';

const STATUS_KEY = 'job:morning';
const STATUS_TTL = 36 * 60 * 60;

function repoRoot(): string {
  const candidates = [process.cwd(), path.resolve(process.cwd(), '..'), path.resolve(process.cwd(), '../..')];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
  }
  return process.cwd();
}

function githubConfig() {
  const token = envValue('GITHUB_WORKFLOW_TOKEN') ?? envValue('GH_TOKEN');
  const repository = envValue('GITHUB_REPOSITORY') ?? 'kawaldeepsingh93/bloomstock';
  const workflow = envValue('GITHUB_MORNING_WORKFLOW') ?? 'morning.yml';
  const ref = envValue('GITHUB_MORNING_REF') ?? 'main';
  return token ? { token, repository, workflow, ref } : null;
}

async function readStatus(): Promise<MorningJobStatus> {
  const { cache } = getContainer();
  return (await cache.get<MorningJobStatus>(STATUS_KEY)) ?? idleMorningStatus();
}

async function writeStatus(status: MorningJobStatus): Promise<MorningJobStatus> {
  const { cache } = getContainer();
  await cache.set(STATUS_KEY, status, STATUS_TTL);
  return status;
}

async function githubJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub ${response.status}: ${body.slice(0, 180)}`);
  }
  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}

async function refreshGithubStatus(current: MorningJobStatus): Promise<MorningJobStatus> {
  const github = githubConfig();
  if (!github || !current.runId) return current;
  const run = await githubJson<{
    status: string;
    conclusion: string | null;
    html_url: string;
  }>(`https://api.github.com/repos/${github.repository}/actions/runs/${current.runId}`, github.token);
  const state = morningStateFromGithub(run.conclusion, run.status);
  return writeStatus({
    ...current,
    state,
    finishedAt: state === 'running' ? null : new Date().toISOString(),
    message: morningStatusMessage(state, 'github'),
    runUrl: run.html_url,
  });
}

async function dispatchGithub(): Promise<MorningJobStatus> {
  const github = githubConfig();
  if (!github) throw new Error('GitHub workflow token is not configured');
  await githubJson(
    `https://api.github.com/repos/${github.repository}/actions/workflows/${github.workflow}/dispatches`,
    github.token,
    { method: 'POST', body: JSON.stringify({ ref: github.ref }) },
  );
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const runs = await githubJson<{
    workflow_runs: { id: number; html_url: string; status: string; created_at: string }[];
  }>(
    `https://api.github.com/repos/${github.repository}/actions/workflows/${github.workflow}/runs?event=workflow_dispatch&per_page=5`,
    github.token,
  );
  const latest = runs.workflow_runs[0];
  return writeStatus({
    state: 'running',
    mode: 'github',
    startedAt: latest?.created_at ?? new Date().toISOString(),
    finishedAt: null,
    message: morningStatusMessage('running', 'github'),
    runId: latest?.id ?? null,
    runUrl: latest?.html_url ?? null,
  });
}

function startLocalJob(): void {
  const child = spawn('pnpm', ['--filter', '@bloomstock/api', 'job:morning'], {
    cwd: repoRoot(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => {
    stderr = `${stderr}${chunk.toString()}`.slice(-800);
  });
  child.on('error', (error) => {
    void writeStatus({
      state: 'failure',
      mode: 'local',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      message: error.message,
      runId: null,
      runUrl: null,
    });
  });
  child.on('exit', (code) => {
    const success = code === 0;
    void writeStatus({
      state: success ? 'success' : 'failure',
      mode: 'local',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      message: success
        ? morningStatusMessage('success', 'local')
        : stderr.trim() || morningStatusMessage('failure', 'local'),
      runId: null,
      runUrl: null,
    });
  });
}

export async function getMorningJobStatus(): Promise<MorningJobStatus> {
  const current = await readStatus();
  if (current.state === 'running' && current.mode === 'github') {
    try {
      return await refreshGithubStatus(current);
    } catch {
      return current;
    }
  }
  return current;
}

export async function startMorningJob(): Promise<MorningJobStatus> {
  const current = await getMorningJobStatus();
  if (current.state === 'running') return current;
  const running: MorningJobStatus = {
    state: 'running',
    mode: githubConfig() ? 'github' : 'local',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    message: morningStatusMessage('running', githubConfig() ? 'github' : 'local'),
    runId: null,
    runUrl: null,
  };
  await writeStatus(running);
  if (githubConfig()) {
    try {
      return await dispatchGithub();
    } catch (error) {
      return writeStatus({
        ...running,
        state: 'failure',
        finishedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Could not dispatch GitHub Actions',
      });
    }
  }
  startLocalJob();
  return running;
}
