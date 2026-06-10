// P0 privacy fix: move director names + phone numbers OUT of the public
// `description` field on schools.
//
// Phase 1 (default):   node --env-file=.env scripts/scrub-school-pii.mjs
//   - For every school whose description contains "დირექტორი: …" / "ტელ.: …"
//     segments (written by the old import script), strip those segments from
//     description, keeping non-personal parts (e.g. "145 მოსწავლე").
//   - The original rows are preserved in school-pii-backup.json next to this
//     script (gitignored) before anything is written.
//   - If the private_contact column exists (migration 0011), the extracted
//     segments are written there in the same pass.
//
// Phase 2 (--restore): node --env-file=.env scripts/scrub-school-pii.mjs --restore
//   - Re-reads school-pii-backup.json and writes the extracted contact
//     segments into private_contact. Use after applying migration 0011 if
//     phase 1 ran before the column existed.
//
// Idempotent: re-running either phase is safe.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BACKUP_PATH = join(dirname(fileURLToPath(import.meta.url)), 'school-pii-backup.json')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) { console.error('SUPABASE_URL / SUPABASE_SECRET_KEY missing'); process.exit(1) }
const db = createClient(url, key, { auth: { persistSession: false } })

// A description segment is private if it names the director or carries a
// phone number (Georgian mobile 5XXXXXXXX, optionally +995/spaces/dashes).
const PRIVATE_SEGMENT = /(დირექტორ|ტელ\.?\s*:|(?:\+?995[\s-]?)?5\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2})/

function splitDescription(description) {
  const segments = String(description).split('·').map((s) => s.trim()).filter(Boolean)
  const publicParts = segments.filter((s) => !PRIVATE_SEGMENT.test(s))
  const privateParts = segments.filter((s) => PRIVATE_SEGMENT.test(s))
  return {
    cleaned: publicParts.join(' · ') || null,
    extracted: privateParts.join(' · ') || null,
  }
}

async function privateContactColumnExists() {
  const { error } = await db.from('schools').select('private_contact').limit(1)
  return !error
}

const restoreMode = process.argv.includes('--restore')
const hasColumn = await privateContactColumnExists()
console.log(`private_contact column: ${hasColumn ? 'present' : 'MISSING (apply supabase/migrations/0011_school_private_contact.sql)'}`)

if (restoreMode) {
  if (!existsSync(BACKUP_PATH)) { console.error(`No backup at ${BACKUP_PATH}`); process.exit(1) }
  if (!hasColumn) { console.error('Cannot restore: private_contact column missing.'); process.exit(1) }
  const backup = JSON.parse(readFileSync(BACKUP_PATH, 'utf8'))
  let restored = 0
  for (const row of backup) {
    if (!row.extracted) continue
    const { error } = await db.from('schools')
      .update({ private_contact: row.extracted }).eq('id', row.id)
    if (error) { console.error(`  ${row.id}: ${error.message}`) } else { restored++ }
  }
  console.log(`Restored private_contact on ${restored} schools from backup.`)
  process.exit(0)
}

const { data: schools, error } = await db.from('schools').select('id, name, description')
if (error) { console.error(error.message); process.exit(1) }

const dirty = (schools || []).filter((s) => s.description && PRIVATE_SEGMENT.test(s.description))
console.log(`${schools.length} schools; ${dirty.length} have personal contact data in description.`)
if (!dirty.length) { console.log('Nothing to scrub.'); process.exit(0) }

// Backup first — merge with any previous backup so repeated runs never lose data.
const previous = existsSync(BACKUP_PATH) ? JSON.parse(readFileSync(BACKUP_PATH, 'utf8')) : []
const byId = new Map(previous.map((r) => [r.id, r]))
for (const s of dirty) {
  const { cleaned, extracted } = splitDescription(s.description)
  if (!byId.has(s.id)) {
    byId.set(s.id, { id: s.id, name: s.name, original_description: s.description, cleaned, extracted })
  }
}
writeFileSync(BACKUP_PATH, JSON.stringify([...byId.values()], null, 2), 'utf8')
console.log(`Backup written: ${BACKUP_PATH}`)

let updated = 0
for (const s of dirty) {
  const { cleaned, extracted } = splitDescription(s.description)
  const patch = { description: cleaned }
  if (hasColumn && extracted) patch.private_contact = extracted
  const { error: e } = await db.from('schools').update(patch).eq('id', s.id)
  if (e) { console.error(`  ${s.id} (${s.name}): ${e.message}`) } else { updated++ }
}
console.log(`Scrubbed ${updated}/${dirty.length} schools.${hasColumn ? ' private_contact populated.' : ' Run with --restore after applying 0011.'}`)
