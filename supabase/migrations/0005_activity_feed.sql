-- BookBridge — migration 0005: public activity feed view.
-- Unions recent public-safe events: donations created, donations delivered, new schools approved.
-- Apply via Supabase Dashboard → SQL Editor. Idempotent.

create or replace view public.v_activity_feed as
  -- Donations created
  select
    'donation_created'::text                    as kind,
    d.id                                        as ref_id,
    coalesce(p.username, 'Anonymous')           as actor_username,
    s.name                                      as target_name,
    s.region                                    as target_region,
    coalesce(
      (select sum(di.quantity)::int from public.donation_items di where di.donation_id = d.id),
      0
    )                                            as quantity,
    d.created_at                                as happened_at
  from public.donations d
  left join public.profiles p on p.id = d.donor_user_id
  left join public.schools  s on s.id = d.beneficiary_school_id

  union all

  -- Donations delivered (newest status change to delivered)
  select
    'donation_delivered'::text                  as kind,
    d.id                                        as ref_id,
    coalesce(p.username, 'Anonymous')           as actor_username,
    s.name                                      as target_name,
    s.region                                    as target_region,
    coalesce(
      (select sum(di.quantity)::int from public.donation_items di where di.donation_id = d.id),
      0
    )                                            as quantity,
    d.updated_at                                as happened_at
  from public.donations d
  left join public.profiles p on p.id = d.donor_user_id
  left join public.schools  s on s.id = d.beneficiary_school_id
  where d.status = 'delivered'

  union all

  -- Schools newly approved
  select
    'school_approved'::text                     as kind,
    s.id                                        as ref_id,
    coalesce(p.username, '')                    as actor_username,
    s.name                                      as target_name,
    s.region                                    as target_region,
    0                                            as quantity,
    s.updated_at                                as happened_at
  from public.schools s
  left join public.profiles p on p.id = s.owner_user_id
  where s.status = 'approved'

  order by happened_at desc;

grant select on public.v_activity_feed to anon, authenticated;
