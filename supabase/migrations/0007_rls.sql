-- BookBridge — 0007: Row Level Security hardening (default-deny)
--
-- ⚠️  MANUAL REVIEW REQUIRED — DO NOT auto-apply.
-- Review this file, then apply it by hand via the Supabase Dashboard → SQL Editor
-- (the project applies migrations through the SQL editor, NOT the supabase CLI).
--
-- WHY THIS EXISTS
-- ---------------------------------------------------------------------------
-- All database access in this app goes through the Express API, which uses the
-- Supabase service_role key. The service_role key BYPASSES Row Level Security
-- entirely, so the server keeps full access no matter what policies exist here.
--
-- The frontend does NOT talk to Supabase directly — it only calls our API
-- (frontend/src/api.js). The one Supabase client (frontend/src/supabaseClient.js)
-- is currently imported nowhere. Therefore the anon / authenticated roles need
-- ZERO direct table access.
--
-- Migration 0001 enabled RLS but also created permissive client-facing policies
-- (e.g. `site_content_public_read using (true)`, `schools_public_read`,
-- `donations_donor_insert`, profile self-select/update, etc.). Because the anon
-- key is never used against tables, those policies are unnecessary attack
-- surface: anyone holding the public anon key could read/insert rows directly.
--
-- This migration adopts a DEFAULT-DENY posture:
--   1. Ensure RLS is enabled on every public table (idempotent).
--   2. Force RLS so even a table owner is subject to policies (service_role
--      still bypasses RLS — it is exempt from FORCE as well).
--   3. Drop every pre-existing anon/authenticated policy. With RLS enabled and
--      no policies present, anon/authenticated get no rows and no writes.
--
-- No SELECT policies are added: audit of the frontend confirms it never queries
-- Supabase directly, so the anon key needs no table access. If a client ever
-- starts hitting Supabase directly, add narrowly-scoped policies in a later
-- migration at that time.
--
-- Idempotent: enabling RLS is safe to re-run; `drop policy if exists` is safe
-- whether or not the policy is present.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Enable + force RLS on all public tables
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles',
    'schools',
    'book_requests',
    'donations',
    'donation_items',
    'monetary_donations',
    'notifications',
    'donation_status_history',
    'site_content'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
    -- FORCE makes the table owner subject to RLS too. service_role bypasses
    -- both ENABLE and FORCE, so the API is unaffected.
    execute format('alter table public.%I force row level security', t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- 2. Drop all existing client-facing policies (default deny for anon/auth)
--    These were created in 0001. Removing them leaves RLS enabled with no
--    policy → no direct access for anon/authenticated. service_role bypasses
--    RLS regardless, so the server keeps working.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_self_select"            on public.profiles;
drop policy if exists "profiles_self_update"            on public.profiles;

drop policy if exists "schools_public_read"             on public.schools;
drop policy if exists "schools_owner_insert"            on public.schools;
drop policy if exists "schools_owner_update"            on public.schools;

drop policy if exists "book_requests_public_read"       on public.book_requests;
drop policy if exists "book_requests_owner_write"       on public.book_requests;

drop policy if exists "donations_donor_read"            on public.donations;
drop policy if exists "donations_donor_insert"          on public.donations;

drop policy if exists "donation_items_read"             on public.donation_items;

drop policy if exists "monetary_donations_donor_read"   on public.monetary_donations;

drop policy if exists "notifications_self_read"         on public.notifications;

drop policy if exists "donation_status_history_read"    on public.donation_status_history;

drop policy if exists "site_content_public_read"        on public.site_content;

-- ---------------------------------------------------------------------------
-- 3. (Intentionally no policies created.)
--    With RLS enabled/forced and no policies, anon + authenticated are fully
--    denied direct table access. All legitimate access flows through the API
--    using the service_role key, which bypasses RLS.
--
--    Pattern to use IF a client ever needs direct read access later
--    (kept here as documentation only — do NOT enable without a real need):
--
--      drop policy if exists "site_content_public_read" on public.site_content;
--      create policy "site_content_public_read"
--        on public.site_content for select
--        to anon, authenticated
--        using (true);
-- ---------------------------------------------------------------------------
