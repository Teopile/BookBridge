# Security

BookBridge is a book-donation platform (no money changes hands in the core flow).
This documents the security posture and the checklist to run before each release.

## Reporting a vulnerability

Email **info@bookbridge.ge** with steps to reproduce. Please do not open public
GitHub issues for security reports. We aim to acknowledge within a few days.

## Architecture (trust boundaries)

- **Frontend** (`frontend/`, Vite SPA on `bookbridge.ge`) — never holds secrets;
  talks to the API **same-origin** via the `/api/*` rewrite in
  `frontend/vercel.json`. Holds only the publishable Supabase key.
- **API** (`server/`, Express on `book-bridge-api.vercel.app`) — the only tier
  that uses the Supabase **service-role** key (`SUPABASE_SECRET_KEY`). All DB
  access goes through `server/db/store.js`; routes never touch the client
  directly.
- **Admin** (`admin/`) — separate SPA for staff (school approval, ownership
  transfer, content).
- **Database** (Supabase, Postgres). RLS is enabled on every table with
  **default-deny** for `anon`/`authenticated`; the app reaches data only through
  the service-role server, so RLS is a second line of defense.

## Controls in place

- **Auth** — Supabase Auth, email **OTP** verification on signup
  (`server/routes/auth.js`). Session is an httpOnly cookie (`bb_session`);
  "remember me" toggles a 30-day vs session cookie. OTP is minted server-side
  (`admin.generateLink`) and delivered by us via Maileroo, so delivery never
  depends on Supabase's rate-limited mailer.
- **CSRF** — double-submit cookie (`bb_csrf` cookie + `x-csrf-token` header),
  hashed constant-time compare (`server/middleware/csrf.js`). The frontend reaches
  the API **same-origin** (via the Vercel `/api` proxy), so the auth cookies are
  **first-party** — third-party-cookie blocking (Safari/iOS, etc.) can't break it.
- **Rate limiting** — per-route in-memory limiter + a Postgres-backed
  cross-instance limiter keyed on the real client IP (`x-forwarded-for`);
  production-only, fails open (`server/lib/ratelimit.js`).
- **Input validation** — Zod schemas at every boundary (`server/schemas.js` +
  `server/middleware/validate.js`).
- **PII minimization** — public school endpoints return only `PUBLIC_SCHOOL_FIELDS`
  (`server/db/store.js`); private contact data is server-only (migration `0011`).
- **GDPR** — account self-deletion (`DELETE /api/auth/me`); donations are
  anonymized, not destroyed.
- **Headers** — HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  Referrer-Policy, Permissions-Policy (`frontend/vercel.json` + Helmet on the API).
- **Atomic DB writes** — contended counters use `security definer` RPCs (e.g.
  `bb_credit_fulfillment`, migration `0012`) instead of read-then-write, to avoid
  lost updates.

## Secrets

Secrets live only in Vercel project env vars — never committed. `*.env.example`
files enumerate the keys with no values.

| Key | Where | If leaked |
|---|---|---|
| `SUPABASE_SECRET_KEY` (service role) | book-bridge-api | Full DB read/write. **Highest blast radius.** Rotate in Supabase → update env → redeploy. |
| `SUPABASE_PUBLISHABLE_KEY` | all | Low (RLS-gated, public by design). |
| `MAILEROO_API_KEY` / `MAILEROO_SMTP_PASS` | book-bridge-api | Can send mail as the domain. Rotate in Maileroo. |
| `CSRF_SECRET` / `COOKIE_SECRET` | book-bridge-api | Forge cookies/CSRF. Rotate → all sessions invalidated. |
| `FLITT_*` (dormant) | book-bridge-api | Payment fraud — only relevant once monetary donations are enabled. |

Rotation procedure (any key): rotate at the provider → update the Vercel env →
redeploy the affected project.

## Database migrations

Numbered, append-only, idempotent SQL in `supabase/migrations/000N_*.sql`, applied
manually (Supabase SQL editor / Management API). Convention: never assume a
migration ran — confirm. Latest: `0012_fulfillment_rpc.sql`.

## Pre-release checklist

- [ ] `npm --prefix server run test:unit` green; `frontend`/`admin` build clean.
- [ ] No secrets in the diff (`git diff` + grep for keys); `.env*` not committed.
- [ ] New state-mutating routes have `csrfProtection` + `requireAuth`/role + Zod `validate`.
- [ ] New public endpoints don't leak PII (use the public projection).
- [ ] Any new pending migration applied to the DB and recorded.
- [ ] `noindex` stays off for production only; legal pages reviewed.
- [ ] Post-deploy smoke: `curl -s https://book-bridge-api.vercel.app/api/health`,
      then a real signup + a donation on the live site.
