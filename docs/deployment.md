# Deployment

## Vercel (web)

1. Import the GitHub repo.
2. Framework: Next.js, root of the repository.
3. Build command: `pnpm turbo build --filter=@bloomstock/web`
4. Environment variables from `.env.example` except worker-only secrets can stay on the worker.
5. Do not expose `KITE_*`, `OPENAI_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## GitHub Pages

The research terminal is Next.js with auth and `/api` routes. GitHub Pages cannot host that process.

Pages publishes the static board in `site/` to `https://kawaldeepsingh93.github.io/bloomstock/`. Enable it once:

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Keep the `GitHub Pages` workflow on `main`.
3. After each morning ingest, the board shows success or failure.

The live desk stays on Vercel or `pnpm --filter @bloomstock/web dev`.

## Worker

Run `apps/api` on a small always-on box or as the weekday GitHub Action `.github/workflows/morning.yml` (03:40 UTC = 09:10 IST). From Settings, **Run morning ingest** starts the same job in the background and polls until it succeeds or fails. With `GITHUB_WORKFLOW_TOKEN` it dispatches the Action; otherwise it runs `pnpm --filter @bloomstock/api job:morning` on the app host.

```bash
pnpm --filter @bloomstock/api job:morning
```

## Docker

```bash
docker compose up --build
```

Redis is required across web replicas so overview cache is shared. Postgres remains Supabase.

## CI

`.github/workflows/ci.yml` runs format, lint, typecheck, unit tests, build, then Playwright.

## Kite token

Kite access tokens expire daily. In Settings, use **Connect Kite**. The callback at `/api/kite/callback` exchanges the request token and stores the access token in `vendor_secrets` (AES-256-GCM). The morning worker reads that vault, then falls back to `KITE_ACCESS_TOKEN` if the vault is empty.

Set the Kite app redirect URL to `{APP_URL}/api/kite/callback` and set `APP_ENCRYPTION_KEY`.
