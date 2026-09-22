FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app .
EXPOSE 3000
CMD ["pnpm", "--filter", "@bloomstock/web", "start"]

FROM node:20-alpine AS worker
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app .
CMD ["pnpm", "--filter", "@bloomstock/api", "start", "morning"]
