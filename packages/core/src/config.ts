import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OPENAI_MODEL: z.string().default('gpt-5'),
  OPENAI_MAX_RECOMMENDATIONS: z.coerce.number().int().positive().default(3),
  DEFAULT_CAPITAL: z.coerce.number().positive().default(100_000),
  DEFAULT_RISK_PERCENT: z.coerce.number().positive().max(5).default(1),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}

/** Dynamic lookup so Next/webpack cannot inline empty NEXT_PUBLIC values at compile time. */
export function envValue(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[name];
  return value && value.length > 0 ? value : undefined;
}

export const INDEX_SYMBOLS = {
  nifty: 'NIFTY 50',
  bankNifty: 'NIFTY BANK',
  vix: 'INDIA VIX',
} as const;

export const NSE_EXCHANGE = 'NSE' as const;
export const DEFAULT_TIMEFRAME = '1d' as const;
export const INDICATOR_LOOKBACK_DAYS = 250;
export const SCAN_UNIVERSE_SIZE = 2000;
