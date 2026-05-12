# SETUP — what you need to do manually

This document is the **one-time setup checklist**. Work top-to-bottom. Most steps are creating accounts and pasting keys into `.env` files. Where Claude can't act for you (browser-based signups, payment provider KYC, DNS), this lists exactly what to do.

> Save every credential to a password manager (1Password, Bitwarden, Proton Pass) as you go. Don't keep secrets in plain-text files outside `.env`.

---

## Phase A — Local development (do this first, before any deploy)

You can build and run BookBridge locally with just **Supabase**, **Node 20+**, and **npm**. Everything else (Maileroo, Flitt, Twilio, Mapbox, DigitalOcean, Cloudflare) is needed only for production.

### A.1. Install prerequisites

- [ ] Install **Node.js 20+** — https://nodejs.org/
- [ ] Install **git** — https://git-scm.com/

Verify:
```bash
node --version   # should print v20.x or higher
npm --version    # should print 10.x or higher
git --version
```

### A.2. Create a Supabase project

1. Go to https://supabase.com → sign up / log in.
2. Click **"New project"**.
   - Name: `bookbridge-dev` (or whatever)
   - Database password: generate a strong one and **save it to your password manager**
   - Region: **`eu-central-1` (Frankfurt)** — lowest latency to Georgia
3. Wait ~2 minutes for provisioning.
4. In the project dashboard, go to **Project Settings → API** and copy three values:
   - **Project URL** — looks like `https://abcdefghij.supabase.co`
   - **`anon` publishable key** (starts with `eyJ...`)
   - **`service_role` secret key** (starts with `eyJ...`) — NEVER expose this in frontend code
5. In **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: add `http://localhost:5173/**` and `http://localhost:5174/**`

### A.3. Apply the initial migration

1. In the Supabase dashboard, go to **SQL Editor**.
2. Click **"New query"**.
3. Open `supabase/migrations/0001_initial_schema.sql` from this repo, copy-paste the entire contents into the SQL Editor, and click **Run**.
4. Verify in **Table Editor** that you see these tables: `profiles`, `schools`, `book_requests`, `donations`, `donation_items`, `monetary_donations`, `notifications`, `donation_status_history`.

> **Migrations are applied manually, not via CLI.** Every migration file in this repo is idempotent (`create ... if not exists` style) so re-running is safe.

### A.4. Configure local `.env` files

Copy templates and fill in the Supabase values from A.2:

```bash
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env
```

Edit each `.env`:

**`server/.env`** — minimum needed to run locally:
```
PORT=3001
NODE_ENV=development
PUBLIC_FRONTEND_ORIGIN=http://localhost:5173
PUBLIC_ADMIN_ORIGIN=http://localhost:5174

SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...      # the anon key
SUPABASE_SECRET_KEY=eyJ...           # the service_role key

CSRF_SECRET=anything-long-and-random-32-chars-min
COOKIE_SECRET=another-long-random-string-32-chars-min
```

**`frontend/.env`** and **`admin/.env`**:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_API_BASE=http://localhost:3001
```

### A.5. Install + run

```bash
npm run install:all
npm run dev
```

Open http://localhost:5173 — you should see the BookBridge landing page.

---

## Phase B — Production accounts (do once before first deploy)

Skip until you're ready to deploy. None of these are reusable from any sister project — every service needs a brand-new account for legal, billing, and DNS isolation.

### B.1. Domain

- [ ] Buy a domain (e.g. `bookbridge.ge`, `bookmountain.org`)
  - Recommended registrars: Porkbun, Namecheap, Cloudflare Registrar
  - `.ge` domains: through a Georgian registrar like `proservice.ge`

### B.2. Cloudflare

- [ ] Sign up at https://cloudflare.com (free plan is plenty).
- [ ] Add your domain. Cloudflare will give you 2 nameservers — **change your domain's nameservers at the registrar to those two values.**
- [ ] Wait for "Active" status (usually 5–60 minutes).
- [ ] In Cloudflare → SSL/TLS, set encryption mode to **Full (strict)**.

### B.3. DigitalOcean droplet

- [ ] Sign up at https://digitalocean.com.
- [ ] Create a droplet:
  - Image: **Ubuntu 24.04 LTS**
  - Size: **Basic, $12/mo** (2GB RAM, 1 vCPU, 50GB SSD) — enough for MVP
  - Datacenter: **Frankfurt (FRA1)**
  - Authentication: **SSH key** (not password)
  - Hostname: `bookbridge-prod`
- [ ] Note the public IPv4 address.
- [ ] In Cloudflare → DNS, add:
  - `A` record: `@` → `<droplet IP>` (proxied / orange-cloud ON)
  - `A` record: `admin` → `<droplet IP>` (proxied / orange-cloud ON)
  - `A` record: `api` → `<droplet IP>` (proxied / orange-cloud ON)
- [ ] SSH into the droplet and follow [DEPLOYMENT.md](./DEPLOYMENT.md).

### B.4. Maileroo (transactional email)

- [ ] Sign up at https://maileroo.com (free tier: 5,000 emails/month).
- [ ] Add your domain → Maileroo gives you DNS records (SPF, DKIM, DMARC). Add them in Cloudflare → DNS (don't proxy them).
- [ ] Wait for Maileroo to verify the domain.
- [ ] In Maileroo → API Keys, create a key. Save to password manager.

**Important — configure Supabase Auth to use Maileroo SMTP on day 1:**
1. Supabase Dashboard → Authentication → Emails → SMTP Settings → enable custom SMTP.
2. Paste Maileroo SMTP host (`smtp.maileroo.com`), port 587, username + password.
3. Set sender as `noreply@yourdomain.ge`.

**Why day 1:** Supabase's built-in mailer hangs intermittently and causes signup outages.

### B.5. SMS provider (pick one)

- **Twilio** (global, ~$0.10/SMS to Georgia): https://twilio.com → buy number → save Account SID + Auth Token.
- **Verify.ge** (Georgian-only, cheap): contact https://verify.ge for API access.

```
SMS_PROVIDER=twilio              # or "verify_ge"
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1234567890
```

### B.6. Flitt (Georgian payment processor — for monetary donations)

- [ ] Register a legal entity (NGO or LLC).
- [ ] Apply at https://flitt.com → upload company registration, ID, IBAN.
- [ ] Wait 3–10 business days for approval.
- [ ] Get Merchant ID, Payment key, Credit private key, Settlement IBAN.
- [ ] Add a webhook → `https://api.yourdomain.ge/api/payments/flitt/webhook`.

```
FLITT_MERCHANT_ID=...
FLITT_PAYMENT_KEY=...
FLITT_CREDIT_PRIVATE_KEY=...
FLITT_WEBHOOK_SECRET=...
```

**Alternative — Stripe** if you want non-Georgian donors.

### B.7. Courier API

This is the **one piece without proven precedent** in any sister project. Options to research:

- **Yandex Delivery** — has public API, broad Georgia coverage
- **Linex.ge** — Georgian courier
- **DPD Georgia** / **Georgian Post**

**MVP strategy:** ship with `COURIER_PROVIDER=manual` (admin marks tracking by hand). Replace with real API once you've signed with a provider — don't block phase 1–2 on this.

```
COURIER_PROVIDER=manual          # or "yandex", "linex", "dpd"
COURIER_API_KEY=...
COURIER_WEBHOOK_SECRET=...
```

### B.8. Mapbox

- [ ] Sign up at https://mapbox.com.
- [ ] Create a public access token (restrict to your domain).
- [ ] Add to `frontend/.env`: `VITE_MAPBOX_TOKEN=pk.eyJ...`

### B.9. Sentry + UptimeRobot (optional)

- Sentry: https://sentry.io → create project → add DSN to `server/.env` (`SENTRY_DSN_SERVER`) and `frontend/.env` (`VITE_SENTRY_DSN`).
- UptimeRobot: https://uptimerobot.com → add a 5-minute HTTP monitor on `https://api.yourdomain.ge/api/health`.

---

## Phase C — First admin user

Once the database is migrated (A.3) and the server is running:

1. Register through the frontend at `/auth` with your email.
2. Confirm your email (link arrives via Supabase Auth → Maileroo).
3. In Supabase Dashboard → SQL Editor, run:
   ```sql
   update profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL@example.com');
   ```
4. Log out and log back in.
5. **Enable TOTP 2FA** for your admin account.

---

## Phase D — Content you need to provide

The platform is generic until you put your project's actual content in:

- [ ] **Logo** — SVG preferred. Default is the 📚 emoji in a gradient tile.
- [ ] **Hero photo** — child in a highland school, holding a book. ~1600×900.
- [ ] **Problem section photo** — sparse/empty school library shelf. ~800×600.
- [ ] **Step 5 photo** — book being delivered. ~1600×600.
- [ ] **Tutorial video** for "How it works" — short (60–90s) screencast.
- [ ] **About page copy** — ~3 paragraphs about who's running the project.
- [ ] **Partner logos** — for the footer.
- [ ] **Real school list** — fill via admin UI once at least one school owner has registered.

Drop image assets in `frontend/public/images/` and reference them as `/images/hero.jpg`.

---

## Phase E — Decisions to make before Phase 3+

Before building the courier integration:

1. **Final production domain?**
2. **Which courier company are you signing with?**
3. **Twilio or Verify.ge for SMS?**
4. **Flitt or Stripe for payments?**
5. **Brand assets ready?**

MVP can launch using: manual courier, email only (skip SMS for v1), skip monetary donations (just books) for v1.

---

## Troubleshooting

- **Supabase `/auth/v1/signup` hangs / 504** → you skipped B.4's SMTP step. Configure Maileroo SMTP in Supabase Auth → Emails.
- **`express-rate-limit` blocks everyone** → make sure `app.set('trust proxy', 1)` is set in `server/index.js` (already done).
- **DigitalOcean blocks SMTP from your droplet** → use Maileroo's HTTPS API, not direct SMTP. Already wired in `server/lib/mailer.js`.
- **CSP blocks Flitt 3-D Secure** → allowlist `pay.flitt.com` and `ecommerce.ufc.ge` in `frame-src`, `child-src`, and `form-action` in `server/index.js` Helmet config.
