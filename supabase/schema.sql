-- Tudo database setup. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Every row belongs to one user, and row level security means each person can only read and write their own rows.
-- The data column only ever holds encrypted text; the app encrypts on the device before uploading.

create table if not exists public.tudo_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data text not null check (length(data) < 10000000),
  updated_at timestamptz not null default now()
);

create table if not exists public.tudo_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  data text not null check (length(data) < 5000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table public.tudo_state enable row level security;
alter table public.tudo_log enable row level security;

drop policy if exists "Own state" on public.tudo_state;
create policy "Own state" on public.tudo_state for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Own log" on public.tudo_log;
create policy "Own log" on public.tudo_log for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Table access: only signed-in users, only what the app needs (row level security then limits them to their own rows).
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.tudo_state, public.tudo_log to authenticated;
revoke all on public.tudo_state, public.tudo_log from anon;
revoke truncate, trigger, references on public.tudo_state, public.tudo_log from authenticated;

-- If someone turned on two-step sign-in, their data is only reachable after the code was entered.
-- The check runs as a security definer function because signed-in users cannot read auth.mfa_factors directly.
create or replace function public.tudo_aal_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors
        where user_id = auth.uid() and status = 'verified'
      );
$$;
revoke all on function public.tudo_aal_ok() from public, anon;
grant execute on function public.tudo_aal_ok() to authenticated;

drop policy if exists "Two-step when enabled" on public.tudo_state;
create policy "Two-step when enabled" on public.tudo_state as restrictive for all to authenticated
  using ((select public.tudo_aal_ok())) with check ((select public.tudo_aal_ok()));

drop policy if exists "Two-step when enabled" on public.tudo_log;
create policy "Two-step when enabled" on public.tudo_log as restrictive for all to authenticated
  using ((select public.tudo_aal_ok())) with check ((select public.tudo_aal_ok()));

-- Lets a signed-in person delete their own account (their rows are removed with it).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
