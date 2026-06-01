-- 0009_inapp_notifications.sql
-- In-website notifications: let the existing notifications table also hold
-- in-app messages (not just the email/sms send log), with a read state.
--
-- The donor gets BOTH a branded email and an in-app notification on every
-- donation status change (see server/lib/notify.js -> notifyDonorOfStatus).
-- When an automated delivery/courier system exists later, it flips the
-- donation status and calls that same function — no schema change needed.

alter table public.notifications drop constraint if exists notifications_channel_check;
alter table public.notifications add constraint notifications_channel_check
  check (channel in ('email', 'sms', 'in_app'));

alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists body text;

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null and channel = 'in_app';
