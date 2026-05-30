# BookBridge — Production Readiness

> Living checklist. Updated 2026-05-30. Status: **live on https://bookbridge.ge** (noindexed), functional,
> but not yet launch-grade. ✅ done · 🔲 not started · 👤 needs you (can't be automated).

---

## ✅ Done

**Infra & domain**
- ✅ Deployed on Vercel: frontend (`book-bridge`), admin (`book-bridge-admin`), API (`book-bridge-api`).
- ✅ Custom domain `bookbridge.ge` live with SSL; `www` → apex redirect. DNS on Cloudflare (A → Vercel).
- ✅ Supabase wired; migrations 0001–0006 applied; 50 schools imported.
- ✅ Supabase Auth Site URL + redirect allow-list point at `bookbridge.ge`.
- ✅ API CORS accepts `bookbridge.ge` (multi-origin).

**Functionality (verified)**
- ✅ Every frontend button/form/widget audited + wired to the API; loading/error/empty states added.
- ✅ Backend: all endpoints audited; `search()` hardened against query-breaking input + stops swallowing errors.
- ✅ `beneficiary_school_id` now required on donations (no untrackable donations).
- ✅ Donation create reordered before best-effort courier booking (no lost donations if a courier throws).
- ✅ `/api/admin/nearest-volunteer` now requires admin auth.

**Performance**
- ✅ Route-level code splitting + vendor chunk: main bundle ~230 KB → ~61 KB; pages lazy-load.
- ✅ Image attrs (width/height, lazy, decoding) across cards/banner/logo/upload → less layout shift.

**Quality / ops**
- ✅ API smoke test (`server/scripts/live-api-smoke-test.mjs`) — 30/30 passing.
- ✅ Playwright E2E specs (`tests/e2e/`) — home, nav, language, schools/search, donate, auth, footer.
- ✅ Visible Chromium walkthroughs passed (10/10 site flows + 5/5 legal pages, 0 console errors).
- ✅ GitHub Actions CI (`.github/workflows/ci.yml`) — build + API smoke + e2e on push/PR.
- ✅ Env-gated, dependency-free error reporting (server `ERROR_WEBHOOK`, frontend `VITE_ERROR_WEBHOOK`).

**Legal scaffolding**
- ✅ Privacy / Terms / Cookies pages live (routes + footer + en/ka i18n). ⚠️ Template — needs lawyer review.

**Access**
- ✅ `teopile.bibiluri@gmail.com` is admin (username `Teopile`).

---

## 🔲 Technical — remaining (I can do these on request)

- 🔲 **Apply RLS migration** `supabase/migrations/0007_rls.sql` — default-deny hardening. The Management API
  blocks this DDL (403), so apply it MANUALLY: Supabase Dashboard → SQL Editor → paste the file → Run. This
  closes a real hole (anyone with the public anon key can currently read/insert rows directly). Safe: the
  server uses `service_role` (bypasses RLS) and the frontend never queries Supabase directly.
- 🔲 **Real rate limiting** — `express-rate-limit` uses in-memory store; on serverless it resets per cold
  start. Move to Upstash Redis / Vercel KV (needs an account — see 👤 below).
- 🔲 **`/api/payments/monetary/me`** is a stub (`[]`); implement when monetary donations go live.
- 🔲 **ka (Georgian) translations** for the legal pages (currently English placeholders, flagged in `ka.js`).
- 🔲 **Flip `noindex` for launch** — see "Launch switch" at the bottom.

---

## 👤 Needs you (external — can't be automated)

| Item | Why | Steps |
|---|---|---|
| **Legal entity (NGO/LLC)** | legitimacy, payments, tax | Register in Georgia; then payment providers will onboard you |
| **Lawyer review of legal pages** | Privacy/Terms/Cookies are templates | Have counsel review + adjust; then remove the in-page "Template" notice |
| **Real photos + `logo.png`** | placeholders now (stock/SVG) | Send image files or drop `frontend/public/logo.png` (~512²); send school photos |
| **og-image + apple-touch-icon** | social cards / iOS icon (files missing) | Add `frontend/public/og-image.png` (1200×630) + `apple-touch-icon.png` (180²); revert TODO comments in `index.html` |
| **Rotate exposed secrets** | shared in chat this session | New Vercel token, Supabase PAT + service_role key, and the account password |
| **Supabase → Frankfurt** | DB is in Tokyo (high latency to Georgia) | See runbook below — needs you to create the project (free-tier API can't) |
| **Production email** | auth emails send from a Maileroo sandbox sender | Verify `bookbridge.ge` in Maileroo + add SPF/DKIM/DMARC in Cloudflare; set sender `noreply@bookbridge.ge` |
| **`info@bookbridge.ge` inbox** | referenced on the site, doesn't exist | Email hosting or forwarding (Cloudflare Email Routing is free) |
| **Final design: F or G** | live site is the older design; F/G mockups await a pick | Tell me F, G, or a blend → I refactor the live site |
| **Payments (Flitt/Stripe)** | monetary donations are `disabled` | Open a merchant account + KYC (needs the legal entity) |
| **Courier integration** | tracking is `manual` | Sign with Yandex/Linex/DPD/Georgian Post; then I wire it |
| **Accounts for ops** | monitoring/rate-limit | Sentry (set `*_ERROR_WEBHOOK`), UptimeRobot (`/api/health`), Upstash (rate limit), analytics (Plausible) |
| **Real data** | 0 volunteer schools; thin book requests | Recruit Tbilisi volunteer-hub schools; have schools add book requests |
| **Subdomains (optional)** | `api.`/`admin.` not wired | Add Cloudflare CNAMEs `api`/`admin` → `cname.vercel-dns.com` (DNS-only); then I switch `VITE_API_BASE` |

---

## Runbook: migrate Supabase Tokyo → Frankfurt (lower latency)

> Do this together — it re-keys everything. Plan ~30–45 min. **Heads-up:** Supabase Auth password hashes
> can't be exported/imported via API, so existing users (you + ~3 testers) will need to reset passwords after.
> If that's unacceptable, skip the move and accept the Tokyo latency.

1. **You:** Supabase Dashboard → New project → region **eu-central-1 (Frankfurt)**, save the DB password.
2. **You:** give me the new project ref + a PAT + the new anon/service_role keys.
3. **Me:** apply migrations `0001`→`0007` in the new project.
4. **Me:** export data from the old project and import into the new one; re-create the 6-digit auth email templates.
5. **Me:** repoint env vars — `book-bridge-api` (`SUPABASE_*`), both SPAs (`VITE_SUPABASE_*`) — and the Auth
   Site URL/redirects; redeploy.
6. **You:** reset your password on the new project; notify testers.
7. **Me:** smoke-test + headed walkthrough; decommission the Tokyo project.

---

## Launch switch (when content + legal + email are ready)

1. Remove the `X-Robots-Tag: noindex` header block from `frontend/vercel.json` so search engines index the
   site. (Kept on now because photos/content are placeholder.)
2. Add the real `og-image.png` + `apple-touch-icon.png`; revert the `index.html` TODO comments.
3. Submit the sitemap (`https://bookbridge.ge/sitemap.xml`) in Google Search Console.
4. Confirm production email deliverability (send yourself a signup + reset).
5. Announce. 🚀
