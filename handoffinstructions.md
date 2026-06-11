# BookBridge — Handoff Instructions (your action list)

> Updated 2026-05-30. The site is **live at https://bookbridge.ge** (currently `noindex` so Google won't list
> it yet), functional, tested, and hardened. This file is the list of things **only you can do**, in a sensible
> order. For the full status of everything, see `PRODUCTION_READINESS.md`.
>
> For most items: do the step, then **tell me** and I'll wire up the code/config side.

---

## ⚡ 2026-06-11 — stakeholder feedback implemented; 3 things now need YOU

The full stakeholder feedback (P0–P4: privacy fix, auth gate, full-width layout, stories page,
About sections, Georgian-first i18n) is implemented and deployed. Director phone numbers were
already **scrubbed from the live DB** (preserved in a local backup on this PC). What's left:

**a) ✅ DONE 2026-06-11 — migrations applied (0007 RLS + 0011), contacts restored**
- You applied both migrations; verified: an anonymous direct DB read now returns **0 rows**
  (default-deny RLS active), the public API serves all 50 schools with only safe fields, and
  the 49 preserved director contacts were restored into the non-public `private_contact`
  column via `scrub-school-pii.mjs --restore`. This supersedes §1a below.
- The local backup file (`server/scripts/school-pii-backup.json`, gitignored) can be deleted
  whenever you're comfortable — the data now lives in the private column.

**b) Real content to replace clearly-marked placeholders**
- `/stories` page: 5 sample stories (badge-marked) in `frontend/src/content/stories.js` —
  send real stories + photos (with guardian consent).
- About "როგორ დაიწყო": placeholder origin story — send the real ~3 paragraphs.
- Optional: team bios/photos (`content/team.js`) and community quotes
  (`content/testimonials.js`) — both sections are live but hidden until records exist.

**c) Georgian copy sign-off (REVIEW-flagged, listed in the session summary)**
- Auth-gate bullet „მიიღე შეტყობინება, როცა სკოლა წიგნს დაიჯავშნის" (your draft, kept verbatim),
  the four value-card titles, and the FAQ answers — have a native speaker confirm the wording.

---

## 0. Log in & look around (2 min)
- Go to **https://bookbridge.ge** → Sign in → `teopile.bibiluri@gmail.com` / `Teoteo_0511`.
- You're an **admin**, so you can reach the admin dashboard.
- **Change your password** from the account page (it was set in plain text in our chat).

## 1. Quick wins you can do today

**a) Apply the security (RLS) migration — 1 min, important**
- Supabase Dashboard (account `bibiluri.teopile@gmail.com`) → your project → **SQL Editor** → New query.
- Open `supabase/migrations/0007_rls.sql` from the repo, paste the whole thing, **Run**.
- Why: right now anyone with the public anon key could read/insert DB rows directly. This closes that. Safe — the app keeps working (the server uses the service-role key, which bypasses this).

**b) Rotate the secrets that were shared in our chat — ~15 min**
- New **Vercel token**: vercel.com → Account → Tokens (delete the old, make a new one).
- New **Supabase** service-role key + Personal Access Token: Supabase → Project Settings → API / Account → Tokens.
- (Your account password — already prompted in step 0.)
- Then update them wherever used and tell me if anything needs re-wiring.

**c) `info@bookbridge.ge` inbox — ~10 min, free**
- Cloudflare → your domain → **Email** → Email Routing → enable → forward `info@bookbridge.ge` to your Gmail.
- Why: the site lists this address (footer, legal pages) but it doesn't receive mail yet.

**d) Tell me the design: F or G (or a blend)**
- The live site is the older design; the F (Trail Journal) / G (Open Library) mockups are in
  `C:\Users\User\Desktop\bookbridge-styles-v4\`. Pick one and I'll refactor the live site to it.

## 2. Content (send me the files, or drop them in place)

- **Logo:** drop a ~512×512 transparent **`logo.png`** into `frontend/public/`. (An SVG fallback shows until then.)
- **Social/iOS images:** add `frontend/public/og-image.png` (1200×630) and `apple-touch-icon.png` (180×180).
  Then tell me — I'll revert the TODO comments in `index.html` so they're used.
- **School photos:** send real photos of the highland schools / kids-with-books (currently stock placeholders).
- **About page copy:** send ~3 paragraphs about who runs BookBridge; I'll put it in.
- **Partner logos** (optional, for the footer).

## 3. Bigger setup (each unblocks a launch requirement)

**a) Legal entity (NGO/LLC)** — register in Georgia. Required for payments, tax, and credibility. External; takes days.

**b) Lawyer review of legal pages** — the Privacy / Terms / Cookies pages are solid **templates** (each says so on
   the page). Have counsel review/adjust, then tell me to remove the "Template" notice. *Note:* the Georgian
   (`/ka`) legal text is a draft machine translation, and the bulleted lists on those pages are still in English —
   plan to finalize the Georgian wording with your lawyer/translator; I'll move it into the site when you have it.

**c) Move Supabase to Frankfurt (lower latency)** — your DB is in **Tokyo**; users are in Georgia. Steps (we do it
   together, ~30–45 min):
   1. You: Supabase → New project → region **eu-central-1 (Frankfurt)**, save the DB password.
   2. You: send me the new project ref + a PAT + the new anon/service-role keys.
   3. I: apply migrations 0001–0007, migrate the data, re-point all env vars, redeploy, smoke-test.
   4. You: reset your password on the new project (auth password hashes can't be migrated) + tell the testers.
   - *Optional* — skip if the latency doesn't bother you.

**d) Production email (so auth emails don't go to spam)** — currently sends from a Maileroo sandbox sender.
   1. Maileroo → add domain `bookbridge.ge` → it gives you SPF/DKIM/DMARC records.
   2. Cloudflare → DNS → add those records (don't proxy them).
   3. Supabase → Authentication → Emails → SMTP → set sender `noreply@bookbridge.ge`.

## 4. When you want monetary donations / real courier

- **Payments:** open a **Flitt** merchant account (NGO/KYC, 3–10 days) *or* **Stripe**. Send me the keys; I'll
  flip `PAYMENT_PROVIDER` on and wire the webhook. (Donations of physical books already work without this.)
- **Courier:** sign with a provider (Yandex Delivery / Linex / DPD / Georgian Post). Until then tracking is
  "manual" (admin marks it). Send me API docs/keys and I'll integrate.

## 5. Ops accounts (optional but recommended)

- **Error monitoring:** create a webhook/Sentry-style sink, then set `VITE_ERROR_WEBHOOK` (frontend) +
  `ERROR_WEBHOOK` (server) in Vercel. (Code is already wired; it's a no-op until these exist.)
- **Uptime:** UptimeRobot → 5-min HTTP monitor on `https://book-bridge-api.vercel.app/api/health`.
- **Real rate limiting:** create an **Upstash Redis** db (free), send me the REST URL/token; I'll swap the
  in-memory limiter (which resets per serverless cold start) for it.
- **Analytics:** Plausible (privacy-friendly) if you want traffic stats; I'll add the snippet.

## 6. Launch switch (do these last, when content + legal + email are ready)

1. Tell me to **remove the `noindex`** (in `frontend/vercel.json`) so Google can index the site.
2. Make sure `og-image.png` + `apple-touch-icon.png` are in place.
3. Submit `https://bookbridge.ge/sitemap.xml` in **Google Search Console**.
4. Send yourself a test signup + password reset to confirm email delivery.
5. Announce. 🚀

---

## Where your credentials live (on this PC)
- `C:\Users\User\bookbridge-vercel-token.txt` — Vercel token
- `C:\Users\User\bookbridge-supabase-secrets.txt` — Supabase URL + keys + PAT
- `C:\Users\User\bookbridge-server-secrets.txt` — CSRF/cookie secrets
(Rotate these per step 1b before going fully public.)

## Fastest path to launch (my suggested order)
1) Apply RLS (1a) → 2) pick F/G (1d) → 3) send logo + school photos + About copy (§2) →
4) Supabase→Frankfurt (3c) → 5) production email (3d) → 6) legal entity + lawyer review (3a/3b) →
7) flip the launch switch (§6). Payments/courier/ops can come after you're live.

**Anything in §1–6 marked "tell me" — just say the word and I'll do the code/config side.**
