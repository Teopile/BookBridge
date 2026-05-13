-- BookBridge — migration 0003: add `username` to profiles, update signup trigger.
-- Apply via Supabase Dashboard → SQL Editor. Idempotent.

-- 1. Add the column (nullable initially so backfill works).
alter table public.profiles
  add column if not exists username text;

-- 2. Backfill: any existing rows get a placeholder derived from their id.
update public.profiles
  set username = 'user_' || substr(replace(id::text, '-', ''), 1, 8)
  where username is null;

-- 3. Case-insensitive unique constraint.
drop index if exists profiles_username_lower_idx;
create unique index profiles_username_lower_idx
  on public.profiles (lower(username));

-- 4. NOT NULL going forward.
alter table public.profiles
  alter column username set not null;

-- 5. Format check: 3–30 chars, A–Z / a–z / 0–9 / _ / -
alter table public.profiles
  drop constraint if exists profiles_username_format_chk;
alter table public.profiles
  add constraint profiles_username_format_chk
  check (username ~ '^[A-Za-z0-9_-]{3,30}$');

-- 6. Replace handle_new_user to set username from user metadata.
--    Falls back to a generated handle when the metadata is missing/invalid.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  base  text;
  suffix int := 0;
  candidate text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', '');

  if uname = '' or uname !~ '^[A-Za-z0-9_-]{3,30}$' then
    base := regexp_replace(lower(coalesce(split_part(new.email, '@', 1), '')), '[^a-z0-9_-]', '', 'g');
    if length(base) < 3 then base := 'user'; end if;
    if length(base) > 26 then base := substr(base, 1, 26); end if;
    candidate := base;
    while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
      suffix := suffix + 1;
      candidate := base || suffix::text;
    end loop;
    uname := candidate;
  end if;

  insert into public.profiles (id, username, full_name, role, language)
  values (
    new.id,
    uname,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'donor'),
    coalesce(new.raw_user_meta_data->>'language', 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- (Trigger is already attached from migration 0001; nothing to re-bind.)
