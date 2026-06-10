// Bulk-import real Shida Kartli schools from two Excel files into public.schools.
//
// Source files (Georgian column headers):
//   გამყოფი ხაზის შიდა ქართლი.xlsx  — schools near the dividing line
//   მაღალმთიანი შიდა ქართლი.xlsx     — highland schools
//
// Each row becomes a beneficiary school with status='approved'. owner_user_id is
// set to the admin user identified by ADMIN_EMAIL so the data is editable from
// the UI. Idempotent: rows whose `name` already exists in public.schools are skipped.

import 'dotenv/config';
import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = process.argv[2] || 'teopile.bibiluri@gmail.com';

const FILES = [
  'C:/Users/Administrator/Downloads/გამყოფი ხაზის შიდა ქართლი.xlsx',
  'C:/Users/Administrator/Downloads/მაღალმთიანი შიდა ქართლი.xlsx',
];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const { data: users, error: lerr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
if (lerr) { console.error('listUsers failed:', lerr.message); process.exit(1); }
const admin = users.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
if (!admin) { console.error(`No user with email ${ADMIN_EMAIL}`); process.exit(1); }
console.log(`Owner: ${admin.email}  (${admin.id})`);

const rows = [];
for (const path of FILES) {
  const wb = xlsx.readFile(path);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const items = xlsx.utils.sheet_to_json(ws, { defval: null, raw: false });
  for (const r of items) {
    const name = r['საჯარო სკოლის დასახელება']?.trim();
    if (!name) continue;
    const region   = r['რეგიონი']?.trim() || 'შიდა ქართლი';
    const city     = r['რაიონი']?.trim() || null;
    const director = r['დირექტორი']?.trim() || null;
    const phone    = r['ნომერი']?.trim() || null;
    const email    = r['მეილი']?.trim() || null;
    const count    = r['მოსწავლეთა რაოდენობა']?.trim() || null;

    // Privacy: director names and phone numbers are PERSONAL data. They go in
    // private_contact (admin/owner-only, see migration 0011) — NEVER in
    // description, which renders publicly. Description keeps only the student
    // count, which is not personal.
    const description = count ? `${count} მოსწავლე` : null;

    const privateParts = [];
    if (director) privateParts.push(`დირექტორი: ${director}`);
    if (phone)    privateParts.push(`ტელ.: ${phone}`);
    const private_contact = privateParts.join(' · ') || null;

    rows.push({
      type: 'beneficiary',
      status: 'approved',
      name,
      region,
      city,
      description,
      private_contact,
      contact_email: email,
      owner_user_id: admin.id,
    });
  }
}
console.log(`Parsed ${rows.length} rows from ${FILES.length} files.`);

const { data: existing } = await supabase.from('schools').select('name');
const existingNames = new Set((existing || []).map((s) => s.name));
const toInsert = rows.filter((r) => !existingNames.has(r.name));
console.log(`${toInsert.length} new, ${rows.length - toInsert.length} already in DB.`);

if (toInsert.length === 0) {
  console.log('Nothing to import.');
  process.exit(0);
}

let inserted = 0;
for (let i = 0; i < toInsert.length; i += 50) {
  const batch = toInsert.slice(i, i + 50);
  const { error } = await supabase.from('schools').insert(batch);
  if (error) { console.error('insert failed:', error.message); process.exit(1); }
  inserted += batch.length;
  console.log(`  inserted ${inserted}/${toInsert.length}`);
}

console.log(`Done. ${inserted} schools imported (all approved, type=beneficiary).`);
