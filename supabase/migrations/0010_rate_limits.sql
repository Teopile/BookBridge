-- 0010_rate_limits.sql
-- Serverless-safe rate limiting backed by Postgres.
--
-- The Express in-memory limiter resets per serverless instance, so it does not
-- actually enforce a global limit on Vercel. This shared table + atomic
-- function give a fixed-window limiter whose count is global across instances,
-- with no external dependency (e.g. Upstash) required.
--
-- Called server-side via the service_role key (server/lib/ratelimit.js ->
-- bb_rate_limit). The table is RLS-enabled with no policies (deny-all to anon /
-- authenticated); only service_role, which bypasses RLS, touches it.

create table if not exists public.rate_limits (
  key          text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;

-- Atomic fixed-window check. Returns true if the request is allowed, false if
-- the per-key limit is exceeded within the window. Row lock (FOR UPDATE) makes
-- concurrent hits on the same key safe.
create or replace function public.bb_rate_limit(p_key text, p_limit int, p_window int)
returns boolean
language plpgsql
as $func$
declare
  v_count int;
  v_start timestamptz;
begin
  select count, window_start into v_count, v_start
    from public.rate_limits where key = p_key for update;
  if not found then
    insert into public.rate_limits(key, count, window_start) values (p_key, 1, now())
      on conflict (key) do update set count = public.rate_limits.count + 1;
    return true;
  end if;
  if v_start < now() - make_interval(secs => p_window) then
    update public.rate_limits set count = 1, window_start = now() where key = p_key;
    return true;
  end if;
  if v_count >= p_limit then
    return false;
  end if;
  update public.rate_limits set count = count + 1 where key = p_key;
  return true;
end;
$func$;

-- Only the server (service_role) may call it.
revoke execute on function public.bb_rate_limit(text, int, int) from public, anon, authenticated;
