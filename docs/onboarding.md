# Developer onboarding

## Day one

1. Node 20, pnpm 9 (`corepack enable`).
2. `pnpm install`
3. `cp .env.example .env`
4. `pnpm test` — trading, AI, notifications, and risk tests must pass without vendor keys.
5. `pnpm --filter @bloomstock/web dev` and open `/dashboard`.

## How to add a feature

Keep the vertical slice:

1. Domain type in `packages/core`
2. Pure logic + Jest in the owning package
3. Repository method in `packages/database`
4. Route handler with Zod in `apps/web`
5. UI in `apps/web/src/app/(terminal)`
6. Docs if the contract changed

Do not put SQL in React. Do not put OpenAI calls in the indicator module.

## Local market data

Without Kite, the terminal still renders. Scanner and recommendations fail closed with a typed error. That is intended.

To go live: Supabase migrations `0001`–`0004`, `APP_ENCRYPTION_KEY`, Connect Kite from Settings, OpenAI key, then `job:morning`.

## Style

- Strict TypeScript, no `any`
- Functions stay small
- Composition over inheritance
- Prompts in the database, never inlined in agents
