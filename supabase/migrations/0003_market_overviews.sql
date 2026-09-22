create table if not exists public.market_overviews (
  as_of timestamptz primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists market_overviews_created_at_idx on public.market_overviews (created_at desc);
