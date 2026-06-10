-- 0011 — private_contact column for schools.
--
-- Why: the bulk-imported school records carried the director's name and
-- personal mobile number inside `description`, which renders on PUBLIC pages.
-- That data is operationally useful (reaching the school) but must not be
-- visible to anonymous visitors.
--
-- This column is NOT in the public API projection (see PUBLIC_SCHOOL_FIELDS in
-- server/db/store.js); it is returned only on owner/admin endpoints that use
-- select('*'). With 0007's default-deny RLS applied, direct PostgREST reads
-- can't see it either.
--
-- After applying this, run:  node --env-file=.env scripts/scrub-school-pii.mjs --restore
-- (from server/) to move the preserved director/phone data into this column.
--
-- Idempotent: safe to run more than once.

alter table public.schools
  add column if not exists private_contact text;

comment on column public.schools.private_contact is
  'Internal contact info (director name, phone). Owner/admin only — never exposed on public endpoints.';
