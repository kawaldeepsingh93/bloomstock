-- BloomStock production schema
-- Auth lives in auth.users. Application tables live in public.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('viewer', 'trader', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'exchange_code') then
    create type public.exchange_code as enum ('NSE', 'BSE');
  end if;
  if not exists (select 1 from pg_type where typname = 'timeframe_code') then
    create type public.timeframe_code as enum ('1m', '5m', '15m', '1h', '1d', '1w');
  end if;
  if not exists (select 1 from pg_type where typname = 'market_regime') then
    create type public.market_regime as enum ('bullish', 'neutral', 'bearish');
  end if;
  if not exists (select 1 from pg_type where typname = 'setup_type') then
    create type public.setup_type as enum ('breakout', 'cup_handle', 'flag', 'ascending_triangle');
  end if;
  if not exists (select 1 from pg_type where typname = 'trade_status') then
    create type public.trade_status as enum ('open', 'closed', 'stopped', 'target_hit');
  end if;
  if not exists (select 1 from pg_type where typname = 'holding_action') then
    create type public.holding_action as enum ('hold', 'sell', 'trail');
  end if;
  if not exists (select 1 from pg_type where typname = 'prompt_slug') then
    create type public.prompt_slug as enum ('todays_trade', 'portfolio_review', 'ipo_analysis', 'stock_deep_research');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type public.notification_channel as enum ('email', 'telegram', 'whatsapp');
  end if;
  if not exists (select 1 from pg_type where typname = 'ipo_status') then
    create type public.ipo_status as enum ('upcoming', 'open', 'closed', 'listed');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'trader',
  capital numeric(18, 2) not null default 100000 check (capital > 0),
  risk_percent numeric(5, 2) not null default 1 check (risk_percent > 0 and risk_percent <= 5),
  telegram_chat_id text,
  whatsapp_number text,
  notify_email boolean not null default true,
  notify_telegram boolean not null default false,
  notify_whatsapp boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instruments (
  symbol text not null,
  exchange public.exchange_code not null,
  name text not null,
  isin text,
  sector text,
  industry text,
  market_cap numeric(20, 2),
  lot_size integer not null default 1 check (lot_size > 0),
  tick_size numeric(10, 4) not null default 0.05 check (tick_size > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (symbol, exchange)
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists (id) on delete cascade,
  symbol text not null,
  exchange public.exchange_code not null,
  added_at timestamptz not null default now(),
  unique (watchlist_id, symbol, exchange),
  foreign key (symbol, exchange) references public.instruments (symbol, exchange)
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  capital numeric(18, 2) not null check (capital > 0),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  symbol text not null,
  exchange public.exchange_code not null,
  quantity numeric(18, 4) not null check (quantity > 0),
  avg_price numeric(18, 4) not null check (avg_price > 0),
  invested_at date,
  unique (portfolio_id, symbol, exchange),
  foreign key (symbol, exchange) references public.instruments (symbol, exchange)
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  portfolio_id uuid references public.portfolios (id) on delete set null,
  symbol text not null,
  exchange public.exchange_code not null,
  side text not null default 'long' check (side = 'long'),
  entry numeric(18, 4) not null check (entry > 0),
  stop_loss numeric(18, 4) not null check (stop_loss > 0),
  target_1 numeric(18, 4) not null check (target_1 > 0),
  target_2 numeric(18, 4) not null check (target_2 > 0),
  quantity integer not null check (quantity > 0),
  status public.trade_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  pnl numeric(18, 4),
  check (stop_loss < entry),
  check (target_1 > entry),
  check (target_2 >= target_1),
  foreign key (symbol, exchange) references public.instruments (symbol, exchange)
);

create table if not exists public.ohlcv (
  symbol text not null,
  exchange public.exchange_code not null,
  timeframe public.timeframe_code not null,
  ts timestamptz not null,
  open numeric(18, 4) not null,
  high numeric(18, 4) not null,
  low numeric(18, 4) not null,
  close numeric(18, 4) not null,
  volume numeric(20, 2) not null check (volume >= 0),
  ingested_at timestamptz not null default now(),
  primary key (symbol, exchange, timeframe, ts),
  foreign key (symbol, exchange) references public.instruments (symbol, exchange),
  check (high >= low),
  check (high >= open),
  check (high >= close),
  check (low <= open),
  check (low <= close)
);

create table if not exists public.indicator_snapshots (
  symbol text not null,
  exchange public.exchange_code not null,
  timeframe public.timeframe_code not null,
  as_of timestamptz not null,
  close numeric(18, 4) not null,
  volume numeric(20, 2) not null,
  ema20 numeric(18, 4) not null,
  ema50 numeric(18, 4) not null,
  ema200 numeric(18, 4) not null,
  rsi numeric(8, 4) not null,
  macd numeric(18, 6) not null,
  macd_signal numeric(18, 6) not null,
  macd_histogram numeric(18, 6) not null,
  atr numeric(18, 4) not null,
  bb_upper numeric(18, 4) not null,
  bb_middle numeric(18, 4) not null,
  bb_lower numeric(18, 4) not null,
  volume_ratio numeric(10, 4) not null,
  average_volume_20 numeric(20, 2) not null,
  created_at timestamptz not null default now(),
  primary key (symbol, exchange, timeframe, as_of),
  foreign key (symbol, exchange) references public.instruments (symbol, exchange)
);

create table if not exists public.fii_dii_data (
  as_of date primary key,
  fii_buy numeric(18, 2) not null,
  fii_sell numeric(18, 2) not null,
  fii_net numeric(18, 2) not null,
  dii_buy numeric(18, 2) not null,
  dii_sell numeric(18, 2) not null,
  dii_net numeric(18, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  symbol text,
  exchange public.exchange_code,
  headline text not null,
  source text not null,
  url text,
  published_at timestamptz not null,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  summary text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_scans (
  id uuid primary key default gen_random_uuid(),
  scan_date date not null unique,
  market_regime public.market_regime not null,
  vix numeric(10, 4),
  nifty_close numeric(18, 4),
  stocks_scanned integer not null check (stocks_scanned >= 0),
  no_trade_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.scan_results (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.daily_scans (id) on delete cascade,
  symbol text not null,
  exchange public.exchange_code not null,
  setup_type public.setup_type,
  score numeric(8, 2) not null,
  confidence numeric(8, 2) not null,
  entry numeric(18, 4),
  stop_loss numeric(18, 4),
  target_1 numeric(18, 4),
  target_2 numeric(18, 4),
  position_size integer,
  rejected_reason text,
  reasons jsonb not null default '[]'::jsonb,
  foreign key (symbol, exchange) references public.instruments (symbol, exchange)
);

create table if not exists public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  slug public.prompt_slug not null,
  version integer not null check (version > 0),
  system_prompt text not null,
  user_prompt text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (slug, version)
);

create unique index if not exists prompt_templates_one_active
  on public.prompt_templates (slug)
  where is_active;

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  scan_result_id uuid references public.scan_results (id) on delete set null,
  prompt_slug public.prompt_slug not null,
  prompt_version integer not null,
  agent_outputs jsonb not null,
  reasoning text not null,
  confidence numeric(8, 2) not null check (confidence >= 0 and confidence <= 100),
  created_at timestamptz not null default now()
);

create table if not exists public.saved_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  filters jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.ipo_issues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  symbol text,
  open_date date not null,
  close_date date not null,
  price_band_low numeric(18, 4),
  price_band_high numeric(18, 4),
  lot_size integer,
  status public.ipo_status not null default 'upcoming',
  check (close_date >= open_date)
);

create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel public.notification_channel not null,
  payload jsonb not null,
  status text not null check (status in ('queued', 'sent', 'failed')),
  error text,
  sent_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  resource text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create index if not exists watchlists_user_id_idx on public.watchlists (user_id);
create index if not exists holdings_portfolio_id_idx on public.holdings (portfolio_id);
create index if not exists trades_user_id_opened_at_idx on public.trades (user_id, opened_at desc);
create index if not exists ohlcv_symbol_ts_idx on public.ohlcv (symbol, timeframe, ts desc);
create index if not exists indicator_snapshots_as_of_idx on public.indicator_snapshots (as_of desc);
create index if not exists news_symbol_published_idx on public.news (symbol, published_at desc);
create index if not exists scan_results_scan_id_score_idx on public.scan_results (scan_id, score desc);
create index if not exists ai_recommendations_created_at_idx on public.ai_recommendations (created_at desc);
create index if not exists audit_logs_user_created_idx on public.audit_logs (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists instruments_set_updated_at on public.instruments;
create trigger instruments_set_updated_at
before update on public.instruments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.watchlists (user_id, name, is_default)
  values (new.id, 'Default', true);
  insert into public.portfolios (user_id, name, capital)
  values (new.id, 'Primary', 100000);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

do $$
begin
  grant execute on function public.handle_new_user() to supabase_auth_admin;
exception
  when undefined_object then null;
end
$$;

alter table public.profiles enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.trades enable row level security;
alter table public.saved_scans enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.notifications_log enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "watchlists_self" on public.watchlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "watchlist_items_self" on public.watchlist_items
  for all using (
    exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid())
  );

create policy "portfolios_self" on public.portfolios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "holdings_self" on public.holdings
  for all using (
    exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = auth.uid())
  );

create policy "trades_self" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "saved_scans_self" on public.saved_scans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recommendations_self" on public.ai_recommendations
  for select using (user_id is null or auth.uid() = user_id);

create policy "notifications_self" on public.notifications_log
  for select using (auth.uid() = user_id);

create policy "audit_self" on public.audit_logs
  for select using (auth.uid() = user_id);
