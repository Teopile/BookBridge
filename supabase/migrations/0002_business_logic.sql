-- BookBridge — migration 0002: business-logic triggers & helpers.
-- Apply via Supabase Dashboard → SQL Editor. Idempotent.

-- ---------------------------------------------------------------------------
-- 1. Trigger: keep book_requests.quantity_fulfilled in sync with deliveries.
-- ---------------------------------------------------------------------------
create or replace function public.bump_book_request_fulfillment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  if TG_OP = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'delivered' and (TG_OP = 'INSERT' or old.status is distinct from 'delivered') then
    for rec in
      select matched_request_id, sum(quantity) as qty
      from donation_items
      where donation_id = new.id and matched_request_id is not null
      group by matched_request_id
    loop
      update book_requests
        set quantity_fulfilled = least(quantity_needed, quantity_fulfilled + rec.qty)
        where id = rec.matched_request_id;
    end loop;
  end if;

  if TG_OP = 'UPDATE' and old.status = 'delivered' and new.status is distinct from 'delivered' then
    for rec in
      select matched_request_id, sum(quantity) as qty
      from donation_items
      where donation_id = new.id and matched_request_id is not null
      group by matched_request_id
    loop
      update book_requests
        set quantity_fulfilled = greatest(0, quantity_fulfilled - rec.qty)
        where id = rec.matched_request_id;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bump_fulfillment on public.donations;
create trigger trg_bump_fulfillment
  after insert or update on public.donations
  for each row execute function public.bump_book_request_fulfillment();

-- ---------------------------------------------------------------------------
-- 2. View: items from delivered donations only (for public stats).
-- ---------------------------------------------------------------------------
create or replace view public.v_delivered_items as
  select di.*
  from public.donation_items di
  join public.donations d on d.id = di.donation_id
  where d.status = 'delivered';

grant select on public.v_delivered_items to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Helper: nearest volunteer school(s) to a given lat/lng (Haversine).
-- ---------------------------------------------------------------------------
create or replace function public.nearest_volunteer_schools(
  in_lat numeric, in_lng numeric, in_limit int default 5
)
returns table(id uuid, name text, distance_km numeric)
language sql
stable
as $$
  select s.id, s.name,
    ( 6371 * acos(
        cos(radians(in_lat)) * cos(radians(s.lat))
        * cos(radians(s.lng) - radians(in_lng))
      + sin(radians(in_lat)) * sin(radians(s.lat))
    ))::numeric as distance_km
  from public.schools s
  where s.type = 'volunteer'
    and s.status = 'approved'
    and s.lat is not null
    and s.lng is not null
  order by distance_km asc
  limit in_limit;
$$;

grant execute on function public.nearest_volunteer_schools(numeric, numeric, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Index for fast donor-history lookups.
-- ---------------------------------------------------------------------------
create index if not exists donations_donor_created_idx
  on public.donations(donor_user_id, created_at desc);
