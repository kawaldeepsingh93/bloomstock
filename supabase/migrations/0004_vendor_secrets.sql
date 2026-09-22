create table if not exists public.vendor_secrets (
  provider text primary key,
  payload_ciphertext text not null,
  iv text not null,
  tag text not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.vendor_secrets enable row level security;

do $$
begin
  alter table public.ipo_issues
    add constraint ipo_issues_symbol_open unique (symbol, open_date);
exception
  when duplicate_object then null;
end
$$;
