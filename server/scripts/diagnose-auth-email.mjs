// Diagnose why signup OTPs aren't arriving.
//
// 1. Lists recent users (last 20) — shows confirmed vs pending, helps spot
//    "user already exists, so Supabase silently dropped the resend".
// 2. Generates a fresh signup link for a throwaway probe address to verify
//    that Supabase Auth itself can mint OTPs (it returns the OTP whether the
//    email is actually sent or not — useful for isolating SMTP problems).
//
// Run from server/: node scripts/diagnose-auth-email.mjs

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });

console.log('Supabase project:', url);
console.log('');

console.log('-- Recent users (last 20, newest first) --');
const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 20 });
if (error) {
  console.error('listUsers failed:', error.message);
  process.exit(1);
}
for (const u of list.users) {
  const created = new Date(u.created_at);
  const ageMin = Math.round((Date.now() - created.getTime()) / 60000);
  const confirmed = u.email_confirmed_at ? 'CONFIRMED' : 'PENDING  ';
  console.log(`  ${confirmed}  ${u.email.padEnd(40)}  ${ageMin}m ago`);
}

console.log('');
console.log('-- Triggering a fresh signup-link generation (no email send) --');
const probeEmail = `diag-${Date.now()}@bookbridge-test.example`;
const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',
  email: probeEmail,
  password: 'TestPassword12345!',
});
if (linkErr) {
  console.error('  generateLink FAILED:', linkErr.message);
} else {
  console.log('  Generated for:', probeEmail);
  console.log('  OTP that Supabase would email:', link.properties.email_otp);
  console.log('  Action link:', link.properties.action_link?.slice(0, 90) + '...');
  console.log('');
  console.log('  Note: generateLink returns the OTP whether the email actually sends or not.');
  console.log('  If you got an OTP here but the user did NOT receive one,');
  console.log('  the failure is at Supabase Auth -> SMTP, not at our server.');
  if (link.user?.id) {
    await supabaseAdmin.auth.admin.deleteUser(link.user.id).catch(() => {});
  }
}

console.log('');
console.log('-- Likely causes if email never arrives --');
console.log('  A) Supabase Auth -> SMTP Settings is unconfigured (uses Supabase default mailer,');
console.log('     which has a 3-4 email/hour limit on the free tier and often filters to spam).');
console.log('     Fix: Supabase Dashboard -> Authentication -> SMTP Settings, enter Maileroo SMTP.');
console.log('');
console.log('  B) User already exists. signUp on an existing email succeeds silently with no email.');
console.log('     Check the list above — if your test email shows CONFIRMED already, delete that');
console.log('     row in Supabase Dashboard -> Authentication -> Users and try again.');
console.log('');
console.log('  C) Hit Supabase Auth per-hour rate limit (separate from our app limiter).');
console.log('     Wait ~1h, or configure custom SMTP (option A) to raise the cap.');
console.log('');
console.log('  D) Email landed in spam. Always check spam first.');
