import fs from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

function repoRoot(): string {
  const candidates = [process.cwd(), path.resolve(process.cwd(), '..'), path.resolve(process.cwd(), '../..')];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml')) && fs.existsSync(path.join(dir, '.env'))) {
      return dir;
    }
  }
  return fs.existsSync(path.join(process.cwd(), 'pnpm-workspace.yaml'))
    ? process.cwd()
    : path.resolve(process.cwd(), '../..');
}

function applyDotEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const raw of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const root = repoRoot();
applyDotEnv(path.join(root, '.env'));
applyDotEnv(path.join(root, '.env.local'));
loadEnvConfig(root, true, console, true);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@bloomstock/ai',
    '@bloomstock/core',
    '@bloomstock/database',
    '@bloomstock/market-data',
    '@bloomstock/notifications',
    '@bloomstock/shared',
    '@bloomstock/trading',
    '@bloomstock/ui',
  ],
  serverExternalPackages: ['kiteconnect', 'technicalindicators', 'openai'],
  env: {
    ...(supabaseUrl ? { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } : {}),
    ...(supabaseAnonKey ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey } : {}),
  },
};

export default nextConfig;
