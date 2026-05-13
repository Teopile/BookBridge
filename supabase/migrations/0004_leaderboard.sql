-- BookBridge — migration 0004: donor leaderboard view.
-- Aggregates books delivered per donor (only counts donations where status='delivered').
-- Apply via Supabase Dashboard → SQL Editor. Idempotent.

create or replace view public.v_donor_leaderboard as
  select
    p.id          as user_id,
    p.username,
    coalesce(sum(di.quantity), 0)::int        as total_books,
    count(distinct d.id)::int                  as donation_count
  from public.profiles p
  join public.donations      d  on d.donor_user_id = p.id and d.status = 'delivered'
  join public.donation_items di on di.donation_id  = d.id
  group by p.id, p.username
  having coalesce(sum(di.quantity), 0) > 0
  order by total_books desc, donation_count desc, p.username asc;

grant select on public.v_donor_leaderboard to anon, authenticated;
