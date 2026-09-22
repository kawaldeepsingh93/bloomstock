-- Lock down remaining public tables. The BFF and worker use the service role,
-- which bypasses RLS. Anon gets no access. Authenticated users can read market
-- data only. prompt_templates stays service-role-only (no policies).

do $$
declare
  market_table text;
  policy_name text;
begin
  foreach market_table in array array[
    'instruments',
    'ohlcv',
    'indicator_snapshots',
    'fii_dii_data',
    'news',
    'daily_scans',
    'scan_results',
    'ipo_issues',
    'market_overviews'
  ]
  loop
    execute format('alter table public.%I enable row level security', market_table);
    policy_name := market_table || '_authenticated_read';
    execute format('drop policy if exists %I on public.%I', policy_name, market_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      policy_name,
      market_table
    );
  end loop;
end
$$;

alter table public.prompt_templates enable row level security;
