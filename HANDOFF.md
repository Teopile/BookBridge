# HANDOFF — moving BookBridge to a new PC

> Written 2026-05-19. This is everything you need to continue development on a new machine.

---

## TL;DR

Your code is **100% safe** — clean working tree, every commit pushed to GitHub. Moving PCs is low-risk. The **only** things that don't travel with `git clone` are your **`.env` secrets** (gitignored) and your **password-manager vault**. Bring those and you're done.

---

## 1. State of the project right now

| Thing | State |
|---|---|
| Git remote | `https://github.com/Teopile/BookBridge.git` |
| Branch | `main` (only branch) |
| Working tree | **Clean** — nothing uncommitted |
| Unpushed commits | **None** — `origin/main` is fully up to date |
| Latest commit | `42d2830 fix(prod): cross-origin CSRF via response header + SameSite=None cookies` |
| `node_modules` | Not installed (normal — gitignored, reinstall on new PC) |
| Local `.env` files | **None present** — only `.env.example` templates exist |

Nothing is stuck on the old machine. A fresh `git clone` gives you the complete codebase.

---

## 2. What does NOT travel with git

`.gitignore` excludes these — they will **not** be on the new PC after cloning:

- `node_modules/` — reinstall with `npm run install:all`
- `dist/` — rebuild with `npm run build`
- **`.env`, `.env.local`, `.env.*.local`** — **the secrets. Recreate manually (Section 4).**
- `*.log`, `coverage/`, `.cache/`, `.vscode/`, `.idea/`
- `test-screenshots/`, `tests/mobile-screenshots/`, `tests/fixtures/`, `tests/email-previews/`

The critical one is `.env`. Everything else regenerates itself.

---

## 3. New PC setup — step by step

```bash
# 1. Install prerequisites
#    - Node.js 20+  (old PC ran v24.15.0 — install v24.x to match)
#    - git
node --version    # must be >= 20
git --version

# 2. Clone
git clone https://github.com/Teopile/BookBridge.git
cd BookBridge

# 3. Create env files from templates (then fill them in — Section 4)
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env

# 4. Install all dependencies (root + server + frontend + admin)
npm run install:all

# 5. Run all three apps
npm run dev
```

Then open:
- Frontend: http://localhost:5173
- Admin: http://localhost:5174
- API: http://localhost:3001/api/health → should return `{"status":"ok"}`

---

## 4. Credentials to bring from your password manager

The `.env` files are gitignored, so you must recreate them. **All these values should already be in your password manager** (1Password / Bitwarden / Proton Pass) from the original `SETUP.md` process. If any are missing, regenerate them from the service dashboards.

### `server/.env`
| Key | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → API → `anon` key |
| `SUPABASE_SECRET_KEY` | Supabase → API → `service_role` key (**never expose in frontend**) |
| `CSRF_SECRET` | Random 32+ char string — keep the **same** value as prod or regenerate both |
| `COOKIE_SECRET` | Random 32+ char string — same note as above |
| `MAILEROO_API_KEY` | Maileroo → API Keys |
| `FLITT_MERCHANT_ID` / `FLITT_PAYMENT_KEY` / `FLITT_CREDIT_PRIVATE_KEY` / `FLITT_WEBHOOK_SECRET` | Flitt merchant dashboard |
| `COURIER_API_KEY` / `COURIER_WEBHOOK_SECRET` | Courier provider (currently `manual` — may be blank) |
| `SENTRY_DSN_SERVER` | Sentry project settings (optional) |

For **local dev**, the minimum to boot is: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CSRF_SECRET`, `COOKIE_SECRET`. The rest can stay blank/`disabled`/`manual` until needed.

### `frontend/.env`
| Key | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` above |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same as `anon` key above |
| `VITE_MAPBOX_TOKEN` | Mapbox → Access Tokens (optional for local) |
| `VITE_SENTRY_DSN` | Sentry (optional) |

### `admin/.env`
Only `VITE_API_BASE` (defaults to `http://localhost:3001` for local).

> **Accounts you need login access to** (all in your password manager): Supabase, GitHub (`Teopile`), Maileroo, Flitt, Mapbox, Cloudflare, DigitalOcean, Sentry, the domain registrar. Make sure 2FA recovery codes for each came across too.

---

## 5. Database — nothing to migrate

The database is **managed Supabase in the cloud** — it does not live on your PC. After setting `SUPABASE_*` in `.env`, your new PC connects to the exact same database. No data move needed.

If you ever spin up a *fresh* Supabase project, apply migrations in order via the Supabase SQL Editor:
`0001_initial_schema.sql` → `0002_business_logic.sql` → `0003_username.sql` → `0004_leaderboard.sql` → `0005_activity_feed.sql` → `0006_drop_phone.sql` (all in `supabase/migrations/`, all idempotent).

Also re-apply the two custom auth email templates (6-digit codes) — see `SETUP.md` § A.3b.

---

## 6. Production is unaffected

The live site runs on a **DigitalOcean droplet** behind **Cloudflare** — it keeps running regardless of your PC move. You only need SSH access from the new machine:

- Copy your **SSH private key** to the new PC (`~/.ssh/`), or add a new public key to the droplet.
- Deploy user is `deploy@<droplet-ip>`; code lives in `/var/www/bookbridge`.
- Deploy/rollback/logs procedures: see `DEPLOYMENT.md`.

The droplet has its **own** `server/.env` with production values — that file is independent of your local one and stays put.

---

## 7. Verify the new PC is fully working

- [ ] `git status` → clean, on `main`, up to date with `origin/main`
- [ ] `npm run dev` → all three apps start without errors
- [ ] http://localhost:3001/api/health → `{"status":"ok"}`
- [ ] http://localhost:5173 → landing page loads
- [ ] Sign up / log in works (confirms Supabase keys are correct)
- [ ] http://localhost:5174 → admin loads
- [ ] SSH into the production droplet succeeds
- [ ] Password manager has every credential from Section 4

---

## 8. Reference docs in this repo

- `README.md` — quick start + stack overview
- `SETUP.md` — full account-by-account setup checklist (the original source for all credentials)
- `DEPLOYMENT.md` — DigitalOcean + Cloudflare + nginx deployment

---

## 9. Don't forget on the old PC

Once the new PC is verified working:

- [ ] Securely wipe `server/.env`, `frontend/.env`, `admin/.env` if they exist (they contain live secrets).
- [ ] Confirm nothing uncommitted/unpushed got left behind (`git status` + `git log origin/main..HEAD`).
- [ ] Remove the old PC's SSH key from the droplet if you're decommissioning it.
