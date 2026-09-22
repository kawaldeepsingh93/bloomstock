# BloomStock

Institutional NSE/BSE swing-research terminal. A user asks **Today's Best Trade**. The platform scans the live cash universe, scores setups with deterministic indicators, then an AI desk writes the note.

The model never calculates EMA, RSI, MACD, ATR, volume, or position size. Those numbers come from the trading engine.

## What you get

- Live NSE ingest through Zerodha Kite Connect (Alpha Vantage as a documented fallback)
- Backend indicator snapshots for 2,000 names
- Swing scanner with hard rejects and an explicit **No Trade Today** path
- ATR risk engine (1% of capital, 1:2 / 1:3 targets)
- Five-agent orchestrator with versioned prompt templates
- Dark research terminal (dashboard, scanner, watchlist, portfolio, IPO, news)
- Morning Telegram / WhatsApp / email brief
- Backtest engine, tests, Docker, Vercel, GitHub Actions

## Monorepo map

| Path                     | Role                                          |
| ------------------------ | --------------------------------------------- |
| `apps/web`               | Next.js 15 terminal + REST route handlers     |
| `apps/api`               | Morning ingest / scan / notify worker         |
| `packages/core`          | Domain types, config, errors                  |
| `packages/shared`        | Money, dates, HTTP envelope, logging          |
| `packages/trading`       | Indicators, patterns, scoring, risk, backtest |
| `packages/market-data`   | Kite, Alpha Vantage, NSE FII/DII, cache       |
| `packages/database`      | Supabase client and repositories              |
| `packages/ai`            | LLM client, agents, confidence mixer          |
| `packages/notifications` | Telegram, WhatsApp, email                     |
| `packages/ui`            | Shared terminal primitives                    |
| `supabase/migrations`    | PostgreSQL schema, RLS, prompt seeds          |

## Quick start

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm test
pnpm --filter @bloomstock/web dev
```

The UI boots without secrets. Cards show em-dashes until Kite + Supabase are connected. The app will not invent quotes.

## Required secrets

Copy `.env.example`. Never put Kite, OpenAI, or the Supabase service role in `NEXT_PUBLIC_*`.

1. Create a Supabase project and run `supabase/migrations/*.sql`.
2. Create a Kite Connect app, generate a daily access token, set `KITE_API_KEY` and `KITE_ACCESS_TOKEN`.
3. Set `OPENAI_API_KEY` (model defaults to `gpt-5`).
4. Optional: `REDIS_URL`, Telegram, WhatsApp, Resend.

Then run the morning job:

```bash
pnpm --filter @bloomstock/api job:morning
```

## Architecture in one paragraph

Kite downloads candles into `ohlcv`. `calculateIndicators` writes `indicator_snapshots`. `scanSwingCandidates` applies EMA/RSI/MACD/volume/pattern rules and the ATR risk plan. Only the top three survivors reach OpenAI. Prompts live in `prompt_templates` and are versioned. If the tape is bearish or nothing clears the rules, the desk returns **No Trade Today**.

Read `docs/architecture.md`, `docs/api.md`, `docs/database.md`, `docs/deployment.md`, and `docs/onboarding.md`.

## Scripts

| Command          | Purpose                |
| ---------------- | ---------------------- |
| `pnpm dev`       | Web + worker watch     |
| `pnpm test`      | Jest across packages   |
| `pnpm typecheck` | Strict TypeScript      |
| `pnpm lint`      | ESLint                 |
| `pnpm build`     | Turbo production build |
| `pnpm test:e2e`  | Playwright             |

## Go live

Code for the terminal, scanner, AI desk, Kite vault, blotter, backtest, and morning worker is in the repo. Live prices still need your keys:

1. Copy `.env.example` to `.env` and fill every required secret.
2. Create a Supabase project, run migrations `0001`–`0004`, and paste the URL/anon/service-role keys.
3. Create a Kite Connect app whose redirect URL is `{APP_URL}/api/kite/callback`.
4. Generate `APP_ENCRYPTION_KEY` (16+ characters) so the vault can seal the daily token.
5. Sign in, open Settings, click **Connect Kite**, and complete the Zerodha login. Tokens expire each day.
6. Set `OPENAI_API_KEY`. The model only writes notes; it never computes indicators.
7. Run `pnpm --filter @bloomstock/api job:morning` on a weekday after 09:10 IST (or enable the GitHub Action).
8. Optional: Redis, Telegram, WhatsApp, Resend.

Until those steps succeed, cards stay on em-dashes. The app will not invent quotes.
