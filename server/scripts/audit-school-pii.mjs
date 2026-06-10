// Read-only audit: scan schools (and book_requests/site_content) for personal
// contact data — Georgian mobile patterns, emails, director references.
// Usage: node --env-file=.env.audit scripts/audit-school-pii.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) {
  console.error('SUPABASE_URL / SUPABASE_SECRET_KEY missing')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

// Georgian mobiles: 5XXXXXXXX (9 digits starting with 5), optionally +995-prefixed,
// with spaces/dashes anywhere. Also catch landlines (032 ...).
const PHONE_RE = /(?:\+?995[\s-]?)?(?:5\d{2}|32\d)[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2,3}/g
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const DIRECTOR_RE = /(დირექტორ|director|დირექციის|ხელმძღვანელ)/gi

const findings = []
function scan(table, id, label, field, value) {
  if (!value || typeof value !== 'string') return
  for (const [kind, re] of [['phone', PHONE_RE], ['email', EMAIL_RE], ['director-ref', DIRECTOR_RE]]) {
    const matches = value.match(re)
    if (matches) findings.push({ table, id, label, field, kind, matches: [...new Set(matches)] })
  }
}

const { data: schools, error } = await db
  .from('schools')
  .select('*')
  .order('created_at', { ascending: true })
if (error) { console.error(error); process.exit(1) }

console.log(`schools: ${schools.length} rows; columns: ${Object.keys(schools[0] || {}).join(', ')}`)
for (const s of schools) {
  for (const [field, value] of Object.entries(s)) {
    if (['id', 'owner_user_id', 'created_at', 'updated_at', 'lat', 'lng', 'photo_url'].includes(field)) continue
    scan('schools', s.id, s.name, field, String(value ?? ''))
  }
}

const { data: reqs } = await db.from('book_requests').select('id, school_id, title, author, notes')
for (const r of reqs || []) {
  scan('book_requests', r.id, r.title, 'title', r.title)
  scan('book_requests', r.id, r.title, 'author', r.author)
  scan('book_requests', r.id, r.title, 'notes', r.notes ?? '')
}

const { data: content } = await db.from('site_content').select('key, value_en, value_ka')
for (const c of content || []) {
  scan('site_content', c.key, c.key, 'value_en', c.value_en)
  scan('site_content', c.key, c.key, 'value_ka', c.value_ka)
}

if (!findings.length) {
  console.log('NO personal-contact patterns found.')
} else {
  console.log(`\n=== ${findings.length} findings ===`)
  for (const f of findings) {
    console.log(`[${f.kind}] ${f.table}.${f.field} — "${f.label}" (${f.id})`)
    console.log(`   matches: ${f.matches.join(' | ')}`)
  }
}
