-- 0008_security_invoker_views.sql
-- Fix Supabase Advisor CRITICAL "Security Definer View" findings.
--
-- Postgres views run with the view OWNER's privileges by default, which
-- bypasses Row-Level Security on the underlying tables. For views exposed
-- through PostgREST in the `public` schema this means an anon/authenticated
-- caller could read around RLS. Setting security_invoker = on makes each view
-- run with the QUERYING user's privileges so RLS is enforced.
--
-- The server reads these views via the service_role key (which bypasses RLS
-- regardless), so the public dashboard / leaderboard / activity feed are
-- unaffected — this only closes direct anon access.
--
-- Requires Postgres 15+ (Supabase default).

alter view public.v_activity_feed    set (security_invoker = on);
alter view public.v_donor_leaderboard set (security_invoker = on);
alter view public.v_delivered_items   set (security_invoker = on);
