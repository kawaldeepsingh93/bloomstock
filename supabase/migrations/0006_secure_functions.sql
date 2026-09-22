-- Advisor: mutable search_path on set_updated_at; SECURITY DEFINER handle_new_user
-- must not be callable via PostgREST as anon/authenticated.

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
