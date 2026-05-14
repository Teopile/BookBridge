// Destructively wipes ALL user-generated data from the BookBridge Supabase project.
//
// Deletes (in FK-safe order):
//   public.notifications
//   public.donation_status_history
//   public.donation_items
//   public.monetary_donations
//   public.donations
//   public.book_requests
//   public.schools
//   public.profiles
//   auth.users (via admin API, one at a time — Supabase has no bulk delete)
//
// PRESERVES:
//   public.site_content     (admin-managed CMS keys)
//   schema, migrations, RLS policies, views, triggers, storage buckets
//
// Run from server/: node scripts/nuke-user-data.mjs

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

console.log('Target project:', url);
console.log('');

// Step 1 — wipe public schema tables in FK-safe order.
// .neq('id', '00000000-...') is the documented way to delete-all in PostgREST
// when the table has UUID PKs.
const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const tables = [
  'notifications',
  'donation_status_history',
  'donation_items',
  'monetary_donations',
  'donations',
  'book_requests',
  'schools',
  'profiles',
];

for (const t of tables) {
  process.stdout.write(`  deleting from ${t.padEnd(28)} ... `);
  const { error, count } = await supabase
    .from(t).delete({ count: 'exact' }).neq('id', NIL_UUID);
  if (error) {
    console.log('FAILED:', error.message);
    process.exit(1);
  }
  console.log(`${count ?? '?'} rows`);
}

// Step 2 — list every auth.user and delete via admin API.
// listUsers is paginated, but we wipe one page at a time until empty.
console.log('');
console.log('  deleting auth.users (paged) ...');
let deleted = 0;
for (let safety = 0; safety < 50; safety++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) { console.log('  listUsers FAILED:', error.message); process.exit(1); }
  if (!data.users.length) break;
  for (const u of data.users) {
    const r = await supabase.auth.admin.deleteUser(u.id);
    if (r.error) { console.log(`  delete ${u.email} FAILED:`, r.error.message); continue; }
    deleted++;
  }
}
console.log(`  removed ${deleted} auth users`);

// Step 3 — verify everything is empty.
console.log('');
console.log('Verification:');
for (const t of [...tables, 'site_content']) {
  const { count } = await supabase.from(t).select('id', { count: 'exact', head: true });
  console.log(`  ${t.padEnd(28)} ${count ?? 0} rows`);
}
const { data: leftover } = await supabase.auth.admin.listUsers({ page: 1, perPage: 5 });
console.log(`  auth.users                   ${leftover.users.length} rows`);

console.log('');
console.log('Done. Site schema + site_content CMS keys intact.');
