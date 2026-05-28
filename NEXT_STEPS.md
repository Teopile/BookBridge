# NEXT_STEPS — BookBridge on Vercel

> Written 2026-05-28. Snapshot of what's live, what's blocked on user input, and what's optional polish.

---

## Current state

Two Vercel projects deployed from this monorepo, both connected to `Teopile/BookBridge` GitHub (push to `main` = auto-deploy in ~60s):

| App | Vercel project | Live URL | Root dir |
|---|---|---|---|
| Public SPA | `book-bridge` | https://book-bridge-dun.vercel.app | `frontend/` |
| Admin SPA | `book-bridge-admin` | https://book-bridge-admin.vercel.app | `admin/` |

Both have SPA-routing rewrites + `X-Robots-Tag: noindex` while we're on `*.vercel.app`. Framework preset = `vite` on both.

**Express API (`server/`) is NOT hosted anywhere yet.** Both SPAs load fine, but anything that calls the API will fail (search, signup, donations, dashboard data) until the server is deployed somewhere.

**Supabase env vars are NOT configured on the Vercel projects.** Even direct Supabase reads from the SPAs will throw until the keys are set.

---

## Blocked on you — in priority order

### 1. Supabase keys on Vercel → unblocks public read paths

From Supabase Dashboard → Project Settings → API, grab:
- Project URL (`https://abcdefghij.supabase.co`)
- `anon` publishable key (long `eyJ...`)

Add to **both** Vercel projects (book-bridge and book-bridge-admin), Settings → Environment Variables, scope = Production + Preview + Development:

```
VITE_SUPABASE_URL=<project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
```

Redeploy after (Vercel doesn't auto-rebuild on env-var change). Once set, anything that reads Supabase directly (school list, profiles, etc.) will work.

### 2. Pick a host for the Express server → unblocks signup, donations, search

Vercel doesn't run long-lived Node servers. Best fits for `server/`:

| Host | Free tier | Why |
|---|---|---|
| **Railway** | $5 trial credit, then $5/mo | Auto-deploy from GitHub, easiest |
| **Render** | Free tier (sleeps after 15 min idle) | Most generous free tier |
| **Fly.io** | Free for small apps | Best global latency |
| **Stay on droplet** | Already documented | DEPLOYMENT.md still applies |

Tell me which and I'll wire it up. Server env vars it'll need:

```
SUPABASE_URL=<same as frontend>
SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SECRET_KEY=<service_role key — server-only, NEVER expose to frontend>
CSRF_SECRET=<see C:\Users\User\bookbridge-server-secrets.txt>
COOKIE_SECRET=<see same file>
PUBLIC_FRONTEND_ORIGIN=https://book-bridge-dun.vercel.app
PUBLIC_ADMIN_ORIGIN=https://book-bridge-admin.vercel.app
PORT=3001
NODE_ENV=production
```

### 3. Supabase Auth → URL Configuration

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://book-bridge-dun.vercel.app`
- **Redirect URLs:**
  - `https://book-bridge-dun.vercel.app/**`
  - `https://book-bridge-admin.vercel.app/**`

Without this, password reset emails and OAuth callbacks land on the wrong domain.

### 4. Point SPAs at the deployed API

Once step 2 is done and you have a server URL like `https://bookbridge-api.up.railway.app`, add to both Vercel projects:

```
VITE_API_BASE=<server URL>
```

Then redeploy.

---

## Optional (when you want them)

### 5. Maileroo — transactional email
Sign up at https://maileroo.com (free 5,000 emails/month), verify domain, create an API key.
- Server env: `MAILEROO_API_KEY`, `MAILEROO_FROM`, `MAILEROO_FROM_NAME`.
- **Also wire it as Supabase Auth's custom SMTP** per SETUP.md §B.4 — Supabase's built-in mailer is flaky and breaks signup intermittently.

### 6. Mapbox — school map
Public token from https://mapbox.com, restrict to your Vercel domains.
- Frontend Vercel env: `VITE_MAPBOX_TOKEN`.

### 7. Flitt — Georgian payment processor (skip for MVP)
Requires NGO/LLC + KYC, 3–10 day approval. SETUP.md §B.5. The codebase already supports `PAYMENT_PROVIDER=disabled` so monetary donations stay hidden until ready.

### 8. Custom domain
Buy `bookbridge.ge` (or pick another). Add it to either or both Vercel projects (Settings → Domains). Point DNS at Vercel. Once mapped:
- Remove `X-Robots-Tag: noindex` from both `vercel.json` files.
- The hardcoded `https://bookbridge.ge` URLs in `frontend/index.html` (canonical, OG, JSON-LD) and `sitemap.xml` will start matching reality.

### 9. Replace placeholder content
Per HANDOFF.md §8: logo, hero photo, problem section photo, step 5 photo, tutorial video, About copy, partner logos, real school list.

### 10. Observability
Sentry DSN (both server + frontend), UptimeRobot health monitor pointed at the server's `/api/health`.

---

## What was done in the session this file came out of (2026-05-28)

- Imported repo into Vercel as `book-bridge` (web UI).
- Diagnosed: GitHub auto-deploy was working all along, just slow (~60–120s after push). Set framework preset to `vite` (was `None`).
- Wrote `frontend/vercel.json` — SPA-fallback rewrite so `/en`, `/en/about`, etc. don't 404 on hard refresh.
- Created `book-bridge-admin` project via Vercel API, linked, deployed admin SPA.
- Wrote `admin/vercel.json` — same SPA rewrite + noindex header.
- Added `X-Robots-Tag: noindex` to both projects so the preview URLs aren't indexed (since canonical/OG tags still point at the planned `bookbridge.ge` domain).
- Generated `CSRF_SECRET` and `COOKIE_SECRET` (saved to `C:\Users\User\bookbridge-server-secrets.txt`).
- Vercel access token saved to `C:\Users\User\bookbridge-vercel-token.txt` (expires ~2026-06-27).

---

## How to skip this doc next time

Once everything in §§1-4 is done, every push to `main` will auto-deploy a working production site. Delete this file once it stops being useful.
