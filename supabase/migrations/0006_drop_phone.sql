-- BookBridge — migration 0006: drop phone fields.
-- We decided not to collect or use phone numbers; SMS provider removed too.
-- Apply via Supabase Dashboard → SQL Editor. Idempotent.

alter table public.profiles
  drop column if exists phone;

alter table public.schools
  drop column if exists contact_phone;
