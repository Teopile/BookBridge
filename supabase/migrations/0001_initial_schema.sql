-- BookBridge — initial schema
-- Apply via Supabase Dashboard → SQL Editor (NOT via supabase CLI).
-- Idempotent: every statement uses "if not exists" so re-running is safe.

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null default '',
  role            text not null default 'donor'
                    check (role in ('donor','beneficiary','volunteer','admin')),
  phone           text,
  city            text,
  language        text not null default 'en' check (language in ('en','ka')),
  avatar_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.schools (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid references auth.users(id) on delete set null,
  type            text not null check (type in ('beneficiary','volunteer')),
  name            text not null,
  description     text,
  region          text,
  city            text,
  address         text,
  lat             numeric(9,6),
  lng             numeric(9,6),
  photo_url       text,
  contact_email   text,
  contact_phone   text,
  opening_hours   text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  approval_note   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists schools_type_idx on public.schools(type);
create index if not exists schools_region_idx on public.schools(region);
create index if not exists schools_status_idx on public.schools(status);

create table if not exists public.book_requests (
  id                 uuid primary key default gen_random_uuid(),
  school_id          uuid not null references public.schools(id) on delete cascade,
  request_type       text not null check (request_type in ('title','author','genre')),
  title              text,
  author             text,
  genre              text,
  quantity_needed    integer not null default 1 check (quantity_needed > 0),
  quantity_fulfilled integer not null default 0 check (quantity_fulfilled >= 0),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists book_requests_school_idx on public.book_requests(school_id);
create index if not exists book_requests_type_idx on public.book_requests(request_type);

create table if not exists public.donations (
  id                       uuid primary key default gen_random_uuid(),
  donor_user_id            uuid references auth.users(id) on delete set null,
  beneficiary_school_id    uuid references public.schools(id) on delete set null,
  volunteer_school_id      uuid references public.schools(id) on delete set null,
  delivery_method          text not null check (delivery_method in ('self','courier')),
  status                   text not null default 'pending' check (status in
                             ('pending','at_volunteer','in_transit','delivered','cancelled')),
  courier_provider         text,
  courier_tracking_id      text,
  donor_address            text,
  shipping_fee_tetri       integer,
  track_token              text not null default encode(gen_random_bytes(16), 'hex'),
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create unique index if not exists donations_track_token_idx on public.donations(track_token);
create index if not exists donations_donor_idx on public.donations(donor_user_id);
create index if not exists donations_beneficiary_idx on public.donations(beneficiary_school_id);
create index if not exists donations_volunteer_idx on public.donations(volunteer_school_id);
create index if not exists donations_status_idx on public.donations(status);

create table if not exists public.donation_items (
  id                  uuid primary key default gen_random_uuid(),
  donation_id         uuid not null references public.donations(id) on delete cascade,
  matched_request_id  uuid references public.book_requests(id) on delete set null,
  book_title          text,
  book_author         text,
  book_genre          text,
  quantity            integer not null default 1 check (quantity > 0),
  created_at          timestamptz not null default now()
);
create index if not exists donation_items_donation_idx on public.donation_items(donation_id);

create table if not exists public.monetary_donations (
  id                       uuid primary key default gen_random_uuid(),
  donor_user_id            uuid references auth.users(id) on delete set null,
  amount_minor             integer not null check (amount_minor > 0),
  currency                 text not null default 'GEL',
  status                   text not null default 'pending'
                            check (status in ('pending','succeeded','failed','refunded')),
  provider                 text not null default 'flitt',
  provider_payment_id      text,
  donor_email_for_receipt  text,
  donor_name_for_receipt   text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists monetary_donations_donor_idx on public.monetary_donations(donor_user_id);
create index if not exists monetary_donations_status_idx on public.monetary_donations(status);

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  donation_id     uuid references public.donations(id) on delete set null,
  channel         text not null check (channel in ('email','sms')),
  template        text not null,
  recipient       text not null,
  subject         text,
  sent_at         timestamptz not null default now(),
  status          text not null default 'sent' check (status in ('sent','failed','queued')),
  error_message   text
);
create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_donation_idx on public.notifications(donation_id);

create table if not exists public.donation_status_history (
  id              uuid primary key default gen_random_uuid(),
  donation_id     uuid not null references public.donations(id) on delete cascade,
  from_status     text,
  to_status       text not null,
  changed_by      uuid references auth.users(id) on delete set null,
  changed_at      timestamptz not null default now(),
  note            text
);
create index if not exists donation_status_history_donation_idx on public.donation_status_history(donation_id);

create table if not exists public.site_content (
  key             text primary key,
  value_en        text,
  value_ka        text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id) on delete set null
);

-- ---------------------------------------------------------------------------
-- 3. Trigger: auto-create profile row on new auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'donor'),
    coalesce(new.raw_user_meta_data->>'language', 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Trigger: bump updated_at on row update
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array['profiles','schools','book_requests','donations','monetary_donations','site_content'])
  loop
    execute format('drop trigger if exists touch_%I on public.%I', t, t);
    execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.schools                 enable row level security;
alter table public.book_requests           enable row level security;
alter table public.donations               enable row level security;
alter table public.donation_items          enable row level security;
alter table public.monetary_donations      enable row level security;
alter table public.notifications           enable row level security;
alter table public.donation_status_history enable row level security;
alter table public.site_content            enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "schools_public_read" on public.schools;
create policy "schools_public_read" on public.schools for select
  using (status = 'approved' or auth.uid() = owner_user_id);

drop policy if exists "schools_owner_insert" on public.schools;
create policy "schools_owner_insert" on public.schools for insert with check (auth.uid() = owner_user_id);

drop policy if exists "schools_owner_update" on public.schools;
create policy "schools_owner_update" on public.schools for update
  using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "book_requests_public_read" on public.book_requests;
create policy "book_requests_public_read" on public.book_requests for select using (
  exists (select 1 from public.schools s where s.id = school_id and s.status = 'approved')
);

drop policy if exists "book_requests_owner_write" on public.book_requests;
create policy "book_requests_owner_write" on public.book_requests for all using (
  exists (select 1 from public.schools s where s.id = school_id and s.owner_user_id = auth.uid())
) with check (
  exists (select 1 from public.schools s where s.id = school_id and s.owner_user_id = auth.uid())
);

drop policy if exists "donations_donor_read" on public.donations;
create policy "donations_donor_read" on public.donations for select using (
  auth.uid() = donor_user_id
  or exists (select 1 from public.schools s
             where s.id in (beneficiary_school_id, volunteer_school_id)
               and s.owner_user_id = auth.uid())
);

drop policy if exists "donations_donor_insert" on public.donations;
create policy "donations_donor_insert" on public.donations for insert with check (auth.uid() = donor_user_id);

drop policy if exists "donation_items_read" on public.donation_items;
create policy "donation_items_read" on public.donation_items for select using (
  exists (select 1 from public.donations d
          where d.id = donation_id
            and (d.donor_user_id = auth.uid()
                 or exists (select 1 from public.schools s
                            where s.id in (d.beneficiary_school_id, d.volunteer_school_id)
                              and s.owner_user_id = auth.uid())))
);

drop policy if exists "monetary_donations_donor_read" on public.monetary_donations;
create policy "monetary_donations_donor_read" on public.monetary_donations for select using (auth.uid() = donor_user_id);

drop policy if exists "notifications_self_read" on public.notifications;
create policy "notifications_self_read" on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "donation_status_history_read" on public.donation_status_history;
create policy "donation_status_history_read" on public.donation_status_history for select using (
  exists (select 1 from public.donations d
          where d.id = donation_id
            and (d.donor_user_id = auth.uid()
                 or exists (select 1 from public.schools s
                            where s.id in (d.beneficiary_school_id, d.volunteer_school_id)
                              and s.owner_user_id = auth.uid())))
);

drop policy if exists "site_content_public_read" on public.site_content;
create policy "site_content_public_read" on public.site_content for select using (true);

-- ---------------------------------------------------------------------------
-- 6. Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('school-photos','school-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars','avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('book-covers','book-covers', true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 7. Seed default site copy (EN + KA)
-- ---------------------------------------------------------------------------
insert into public.site_content (key, value_en, value_ka) values
  ('hero.slogan',   'Your book is awaited in the mountains',
                    'შენს წიგნს ელიან მთაში'),
  ('hero.title',    'Your book becomes a bridge to the future',
                    'შენი წიგნი ხდება ხიდი მომავლისკენ'),
  ('hero.desc',     'BookBridge connects donors with mountain schools. Every donated book becomes a chance to change the life of a child you cannot see.',
                    'BookBridge აერთიანებს დონორებსა და მთის სკოლებს. ყოველი გაჩუქებული წიგნი ხდება შანსი, რომ ბავშვს, რომელსაც ვერ ხედავ, შეუცვალო ცხოვრება.'),
  ('mission.title', 'Mission',                   'მისია'),
  ('mission.body',  'Bring knowledge to every highland child — give them the chance of a city library.',
                    'ყოველ მაღალმთიანი სკოლის ბავშვს მივუახლოთ ცოდნა — მათ ქალაქური ბიბლიოთეკის შანსი ვაჩუქოთ.'),
  ('vision.title',  'Vision',                    'ხედვა'),
  ('vision.body',   'A Georgia where place does not define the quality of education — every village has a rich library.',
                    'საქართველო, სადაც ადგილი არ განსაზღვრავს განათლების ხარისხს — ყოველ სოფელს ჰქონდეს მდიდარი ბიბლიოთეკა.')
on conflict (key) do nothing;
