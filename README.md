# BookBridge

**A platform that places books where they belong.**
Slogan: *"შენს წიგნს ელიან მთაში"* — *"Your book is awaited in the mountains."*

Connects book donors with schools in Georgia's highland regions, with Tbilisi-based "volunteer schools" acting as intermediate drop-off / shipping hubs.

## Quick start

```bash
# 1. Install everything
npm run install:all

# 2. Copy env templates (then fill them in — see SETUP.md)
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env

# 3. Apply the initial DB migration in Supabase Dashboard → SQL Editor
#    (file: supabase/migrations/0001_initial_schema.sql)

# 4. Run all three apps in parallel
npm run dev
```

- Frontend (public site): http://localhost:5173
- Admin SPA: http://localhost:5174
- Server (API): http://localhost:3001

## What's here

| Folder | What it is |
|---|---|
| `frontend/` | Vite + React 18 SPA — public site (donors, schools, search) |
| `admin/` | Vite + React 18 SPA — admin dashboard (school approval, donations, stats) |
| `server/` | Node 20 + Express 5 API — Supabase auth proxy, payments, courier, email/SMS |
| `supabase/migrations/` | Numbered SQL migration files — apply manually via Supabase Dashboard SQL Editor |

## What to read next

1. [SETUP.md](./SETUP.md) — **start here**: every account you need to create, every key you need to paste into `.env`, in order.
2. [DEPLOYMENT.md](./DEPLOYMENT.md) — how to deploy to a DigitalOcean droplet behind Cloudflare.

## Stack

- React 18 + Vite, react-router-dom v6
- Express 5 (ESM), Helmet, express-rate-limit, Zod
- Supabase (Postgres + Auth + Storage) — managed
- Maileroo (transactional email via HTTPS API)
- Flitt (Georgian payment processor) — for monetary donations
- Twilio or Verify.ge (SMS)
- Mapbox (school map)
- Cloudflare in front of DigitalOcean droplet