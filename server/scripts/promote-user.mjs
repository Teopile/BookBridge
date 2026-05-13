// Promote (or demote) a user by email to a different role.
//
// Usage:
//   node scripts/promote-user.mjs <email>            # defaults to 'admin'
//   node scripts/promote-user.mjs <email> donor      # demote back to donor
//
// Roles allowed by the schema: donor | admin | school_owner | volunteer_owner

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const [, , email, role = 'admin'] = process.argv;
if (!email) {
  console.error('Usage: node scripts/promote-user.mjs <email> [role=admin]');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
if (listErr) { console.error('listUsers failed:', listErr.message); process.exit(1); }
const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) { console.error(`No user with email ${email}`); process.exit(1); }

const { data, error } = await supabase
  .from('profiles')
  .update({ role })
  .eq('id', user.id)
  .select('id, username, role')
  .single();

if (error) { console.error('update failed:', error.message); process.exit(1); }

console.log(`Promoted ${email} -> role=${data.role} (username=${data.username})`);
