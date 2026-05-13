// BookBridge — visible end-to-end walkthrough.
// Opens Chromium with headless=false so you can watch.
// Run from project root: `node tests/walkthrough.mjs`

import 'dotenv/config';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- Load env from server/.env (tests/ dir has no .env) ----
const envPath = join(__dirname, '..', 'server', '.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const FRONTEND = 'http://localhost:5173';
const ADMIN    = 'http://localhost:5174';
const SHOTS    = join(__dirname, '..', 'test-screenshots');
mkdirSync(SHOTS, { recursive: true });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Get a small test photo fixture; downloads from picsum once and caches.
async function ensurePhotoFixture() {
  const fixturePath = join(__dirname, 'fixtures', 'test-photo.jpg');
  mkdirSync(dirname(fixturePath), { recursive: true });
  if (!existsSync(fixturePath)) {
    const res = await fetch('https://picsum.photos/seed/bookbridge-walk-fixture/600/400.jpg');
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(fixturePath, buf);
    console.log('  📥 downloaded photo fixture (' + buf.length + ' bytes) to ' + fixturePath);
  }
  return fixturePath;
}

let passed = 0, failed = 0;
const findings = [];
function pass(label) { passed++; console.log('  ✓ ' + label); }
function fail(label, detail) { failed++; findings.push({ label, detail }); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
function section(t)  { console.log('\n═══ ' + t + ' ═══'); }
function step(t)     { console.log('  → ' + t); }

const RUN = Date.now().toString(36);
const USER = {
  email:    `test-walk-${RUN}@bookbridge.test`,
  password: 'WalkTest12345!',
  username: `walk_${RUN}`,
};

let cleanupUserId = null;
let cleanupSchoolIds = [];
let cleanupDonationIds = [];

async function setup() {
  section('SETUP — create admin test user via service_role');
  const existing = await sb.auth.admin.listUsers();
  const prev = (existing.data?.users || []).find((u) => u.email === USER.email);
  if (prev) await sb.auth.admin.deleteUser(prev.id);

  const { data, error } = await sb.auth.admin.createUser({
    email: USER.email,
    password: USER.password,
    email_confirm: true,
    user_metadata: { username: USER.username, language: 'en' },
  });
  if (error) throw new Error('createUser: ' + error.message);
  await sb.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
  cleanupUserId = data.user.id;
  pass(`admin test user created — ${USER.email} · ${data.user.id.slice(0, 8)}`);
}

async function shoot(page, name) {
  const filename = String(name).replace(/[^a-zA-Z0-9._-]/g, '_') + '.png';
  await page.screenshot({ path: join(SHOTS, filename), fullPage: true });
  console.log(`    📸 saved test-screenshots/${filename}`);
}

async function loginViaUI(page) {
  await page.goto(FRONTEND + '/en/auth');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type=email]').fill(USER.email);
  await page.locator('input[type=password]').fill(USER.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((u) => u.toString().includes('/account'), { timeout: 10_000 });
}

(async () => {
  try { await setup(); }
  catch (e) { console.log('SETUP FAILED:', e.message); process.exit(1); }

  section('BROWSER — launching visible Chromium (you should see a window open)');
  const browser = await chromium.launch({ headless: false, slowMo: 250 });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push({ url: page.url(), text: msg.text() }); });
  page.on('pageerror', (err) => errors.push({ url: page.url(), text: 'PAGE ERROR: ' + err.message }));

  try {
    section('PHASE 1 — public pages (signed out)');

    step('1.1 Home');
    await page.goto(FRONTEND + '/en');
    await page.waitForLoadState('networkidle');
    const heroH1 = await page.locator('h1').first().textContent();
    if (heroH1?.toLowerCase().includes('donate') || heroH1?.toLowerCase().includes('book')) pass('home hero h1 rendered: "' + heroH1 + '"');
    else fail('home hero h1', `unexpected: "${heroH1}"`);
    await shoot(page, '01-home');

    step('1.2 How it works');
    await page.goto(FRONTEND + '/en/how-it-works');
    await page.waitForLoadState('networkidle');
    await shoot(page, '02-how-it-works');

    step('1.3 About');
    await page.goto(FRONTEND + '/en/about');
    await page.waitForLoadState('networkidle');
    await shoot(page, '03-about');

    step('1.4 Schools list');
    await page.goto(FRONTEND + '/en/schools');
    await page.waitForLoadState('networkidle');
    await shoot(page, '04-schools-empty');

    step('1.5 Schools — Map view');
    const mapPill = page.locator('button.pill', { hasText: /Map|🗺/i });
    if (await mapPill.count() > 0) {
      await mapPill.first().click();
      await page.waitForTimeout(800);
      await shoot(page, '05-schools-map-empty');
      pass('map view toggle works');
    } else fail('map view toggle', 'pill not found');

    step('1.6 Search');
    await page.goto(FRONTEND + '/en/search');
    await page.waitForLoadState('networkidle');
    await shoot(page, '06-search');

    step('1.7 Donate (empty state, no schools)');
    await page.goto(FRONTEND + '/en/donate');
    await page.waitForLoadState('networkidle');
    await shoot(page, '07-donate-empty-state');

    step('1.8 Auth — signin form');
    await page.goto(FRONTEND + '/en/auth');
    await page.waitForLoadState('networkidle');
    await shoot(page, '08-auth-signin');

    step('1.9 Auth — signup form (toggle)');
    const toggle = page.locator('button', { hasText: /create account|register|sign up/i }).first();
    if (await toggle.count() > 0) {
      await toggle.click();
      await page.waitForTimeout(300);
      await shoot(page, '09-auth-signup');
      pass('signup toggle works');
    }

    step('1.10 Forgot password page');
    await page.goto(FRONTEND + '/en/auth/forgot');
    await page.waitForLoadState('networkidle');
    await shoot(page, '10-forgot-password');

    step('1.11 404 page (bogus URL)');
    await page.goto(FRONTEND + '/en/not-a-real-route-xyz');
    await page.waitForLoadState('networkidle');
    await shoot(page, '11-not-found');

    section('PHASE 2 — sign in as admin test user');
    step('2.1 Login flow');
    await loginViaUI(page);
    pass('logged in, redirected to /account');
    await shoot(page, '12-account-after-login');

    step('2.2 Edit profile');
    const editBtn = page.locator('button', { hasText: /edit profile/i }).first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForTimeout(400);
      await shoot(page, '13-account-edit-profile');
      await page.locator('input').nth(1).fill('Walkthrough Tester');
      await page.locator('button', { hasText: /^save$/i }).click();
      await page.waitForTimeout(800);
      pass('edit profile form submitted');
    } else fail('edit profile button', 'not found');

    section('PHASE 3 — register a school + add book request');
    step('3.1 SchoolManage page');
    await page.goto(FRONTEND + '/en/school/manage');
    await page.waitForLoadState('networkidle');
    await shoot(page, '14-school-manage');

    step('3.2 Fill new beneficiary school form');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await page.locator('select').first().selectOption('beneficiary');
    await page.locator('input').nth(0).fill('Walk Test School ' + RUN);
    await page.locator('input').nth(1).fill('Samtskhe-Javakheti');
    await page.locator('input').nth(2).fill('Adigeni');
    await page.locator('input').nth(3).fill('Walk St 1');
    const latInput = page.locator('input[type=number]').nth(0);
    const lngInput = page.locator('input[type=number]').nth(1);
    await latInput.fill('41.6786');
    await lngInput.fill('42.6889');
    await page.locator('textarea').first().fill('Test school registered by the visual walkthrough.');
    await shoot(page, '15-school-create-filled');

    await page.locator('button', { hasText: /Submit for approval/i }).first().click();
    await page.waitForTimeout(1500);
    await shoot(page, '16-school-create-submitted');
    pass('school create form submitted');

    const { data: mySchools } = await sb.from('schools').select('id, name, status').like('name', 'Walk Test School ' + RUN + '%');
    const newSchoolId = mySchools?.[0]?.id;
    if (newSchoolId) {
      cleanupSchoolIds.push(newSchoolId);
      pass('school in DB: ' + newSchoolId.slice(0, 8) + ' · status=' + mySchools[0].status);
    } else fail('school in DB', 'not found after submit');

    step('3.3 Approve school via admin SPA');
    const adminPage = await ctx.newPage();
    await adminPage.goto(ADMIN);
    await adminPage.waitForLoadState('networkidle');
    await shoot(adminPage, '17-admin-dashboard');

    const queueLink = adminPage.locator('a', { hasText: /school queue/i }).first();
    if (await queueLink.count() > 0) {
      await queueLink.click();
      // SPA navigation doesn't fire a real "page load", so waitForLoadState('networkidle')
      // resolves before the new route's useEffect even fires a request. Wait for the
      // actual rendered output instead (either the table or the loaded empty state).
      await adminPage.waitForSelector('table, .table-empty:not(:has-text("Loading"))', { timeout: 10000 }).catch(() => {});
      await shoot(adminPage, '18-admin-school-queue');

      const approveBtn = adminPage.locator('button', { hasText: /^approve$/i }).first();
      if (await approveBtn.count() > 0) {
        await approveBtn.click();
        await adminPage.waitForTimeout(1500);
        await shoot(adminPage, '19-admin-after-approve');
        pass('school approved via admin UI');
      } else fail('approve button', 'not found in queue');
    } else fail('school queue link', 'not found in admin nav');

    step('3.4 Back to school owner — add book request');
    await page.bringToFront();
    await page.goto(FRONTEND + '/en/school/manage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shoot(page, '20-school-manage-after-approve');

    await page.evaluate(() => {
      const h3 = [...document.querySelectorAll('h3')].find((el) => /book requests/i.test(el.textContent));
      if (h3) h3.scrollIntoView();
    });
    await page.waitForTimeout(400);
    // The BookRequestsManager form has type select first, then the Title input (when request_type === 'title')
    // Find the "Add request" button and walk back from it to its form.
    const addRequestBtn = page.locator('button', { hasText: /Add request/i }).first();
    if (await addRequestBtn.count() > 0) {
      // The form's required input that's a plain text input (not the quantity number) is the Title.
      // Use a CSS scope to find it within the same form as the Add request button.
      const reqForm = page.locator('form', { has: page.locator('button', { hasText: /Add request/i }) });
      const titleInput = reqForm.locator('input[required]:not([type=number]):not([type=email])').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill('Walk Book Title');
        await reqForm.locator('input[type=number]').fill('3');
        await addRequestBtn.click();
        await page.waitForTimeout(1500);
        await shoot(page, '21-book-request-added');
        pass('book request added');
      } else fail('book request form', 'title input not found within request form');
    } else fail('book request form', 'Add request button not visible — school picker is probably empty');

    section('PHASE 4 — full donation lifecycle');
    step('4.1 Donate flow — step 1 pick school');
    await page.goto(FRONTEND + '/en/donate');
    await page.waitForLoadState('networkidle');
    await shoot(page, '22-donate-step1');

    const schoolSelect = page.locator('select').first();
    if (await schoolSelect.count() > 0) {
      await schoolSelect.selectOption({ index: 1 });
      await page.waitForTimeout(300);
      await shoot(page, '23-donate-step1-school-picked');
      await page.locator('button', { hasText: /Next/i }).first().click();
      await page.waitForTimeout(700);
    }

    step('4.2 Donate flow — step 2 pick books');
    await shoot(page, '24-donate-step2');
    const firstCheckbox = page.locator('input[type=checkbox]').first();
    if (await firstCheckbox.count() > 0) {
      await firstCheckbox.check();
      await page.waitForTimeout(300);
    }
    await page.locator('button', { hasText: /Next/i }).first().click();
    await page.waitForTimeout(700);

    step('4.3 Donate flow — step 3 delivery');
    await shoot(page, '25-donate-step3');
    await page.locator('button', { hasText: /Next/i }).first().click();
    await page.waitForTimeout(700);

    step('4.4 Donate flow — step 4 confirm');
    await shoot(page, '26-donate-step4');
    await page.locator('button', { hasText: /Confirm donation/i }).first().click();
    await page.waitForURL((u) => u.toString().includes('/track/'), { timeout: 10_000 });
    pass('donation submitted — landed on tracking page');
    await page.waitForLoadState('networkidle');
    await shoot(page, '27-track-after-create');

    const { data: ds } = await sb
      .from('donations')
      .select('id, beneficiary_school_id, status, donation_items(quantity)')
      .eq('donor_user_id', cleanupUserId);
    const newDon = (ds || []).find((d) => d.beneficiary_school_id === newSchoolId);
    if (newDon) {
      cleanupDonationIds.push(newDon.id);
      pass('donation in DB · ' + newDon.id.slice(0, 8));
    } else fail('donation in DB', 'not found');

    step('4.5 Admin: walk donation to delivered');
    await adminPage.bringToFront();
    await adminPage.goto(ADMIN + '/donations');
    await adminPage.waitForLoadState('networkidle');
    await shoot(adminPage, '28-admin-donations-list');

    const updateBtn = adminPage.locator('button', { hasText: /^update$/i }).first();
    if (await updateBtn.count() > 0) {
      await updateBtn.click();
      await adminPage.waitForTimeout(400);
      await shoot(adminPage, '29-admin-status-modal');
      await adminPage.locator('select').last().selectOption('delivered');
      await adminPage.locator('button', { hasText: /^update$/i }).last().click();
      await adminPage.waitForTimeout(1500);
      await shoot(adminPage, '30-admin-after-deliver');
      pass('admin marked delivered via UI');
    } else fail('update donation', 'button not found');

    step('4.6 Track page after delivery');
    await page.bringToFront();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await shoot(page, '31-track-after-deliver');

    section('PHASE 5 — derived views (home + map)');
    step('5.1 Home — leaderboard + activity reflect delivery');
    await page.goto(FRONTEND + '/en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await shoot(page, '32-home-bottom-with-leaderboard-activity');

    step('5.2 Schools list now has 1 school');
    await page.goto(FRONTEND + '/en/schools');
    await page.waitForLoadState('networkidle');
    await shoot(page, '33-schools-with-one');

    step('5.3 Schools — Map view with a pin');
    const mapPill2 = page.locator('button.pill', { hasText: /Map|🗺/i });
    if (await mapPill2.count() > 0) {
      await mapPill2.first().click();
      await page.waitForTimeout(2000);
      await shoot(page, '34-schools-map-with-pin');
    }

    step('5.4 School detail page');
    await page.goto(FRONTEND + '/en/schools/' + newSchoolId);
    await page.waitForLoadState('networkidle');
    await shoot(page, '35-school-detail');

    section('PHASE 6 — language switch to Georgian');
    step('6.1 Toggle KA');
    await page.goto(FRONTEND + '/en');
    await page.waitForLoadState('networkidle');
    const kaToggle = page.locator('button.lang-pill, button', { hasText: /^KA$/ }).first();
    if (await kaToggle.count() > 0) {
      await kaToggle.click();
      await page.waitForURL((u) => u.toString().includes('/ka'), { timeout: 5000 });
      await page.waitForLoadState('networkidle');
      await shoot(page, '36-home-georgian');
      pass('switched to Georgian — URL now /ka');
    } else fail('language toggle', 'KA button not found');

    section('PHASE 7 — admin SPA tour');
    await adminPage.bringToFront();
    step('7.1 Site content CMS');
    await adminPage.goto(ADMIN + '/content');
    await adminPage.waitForLoadState('networkidle');
    await shoot(adminPage, '37-admin-site-content');

    step('7.2 Dashboard');
    await adminPage.goto(ADMIN);
    await adminPage.waitForLoadState('networkidle');
    await shoot(adminPage, '38-admin-dashboard-final');

    section('PHASE 8 — real OTP signup flow (separate user, end-to-end via UI)');
    {
      // Create a brand-new user via the public /register UI so we exercise the OTP code path.
      const otpEmail = `walk-otp-${RUN}@bookbridge.test`;
      const otpUsername = `otp_${RUN}`;
      const otpPassword = 'OtpTest12345!';

      step('8.1 Open a new context (no cookies) and fill signup form');
      const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 820 } });
      const otpPage = await ctx2.newPage();
      otpPage.on('console', (m) => { if (m.type() === 'error') errors.push({ url: otpPage.url(), text: m.text() }); });

      await otpPage.goto(FRONTEND + '/en/auth');
      await otpPage.waitForLoadState('networkidle');
      // Toggle to signup
      await otpPage.locator('button', { hasText: /create account|register|sign up/i }).first().click();
      await otpPage.waitForTimeout(400);
      await otpPage.locator('input[type=email]').fill(otpEmail);
      // Username is the second text input (after email)
      await otpPage.locator('input[type=text]').first().fill(otpUsername);
      await otpPage.locator('input[type=password]').fill(otpPassword);
      await shoot(otpPage, '42-otp-signup-filled');
      await otpPage.locator('button[type=submit]').click();

      step('8.2 Wait for the "verify code" step to render');
      // The verify-otp screen has an input with letterSpacing styling — we look for the otpCode label text.
      await otpPage.waitForSelector('input[inputmode=numeric]', { timeout: 10_000 });
      await shoot(otpPage, '43-otp-verify-screen');
      pass('signup submitted and OTP entry screen rendered');

      step('8.3 Extract the OTP via Supabase admin API');
      // generateLink({ type: 'signup' }) returns the email_otp for the user.
      const linkRes = await sb.auth.admin.generateLink({
        type: 'signup',
        email: otpEmail,
        password: otpPassword,
      });
      const otpCode = linkRes.data?.properties?.email_otp;
      if (!otpCode) {
        fail('otp extraction', 'admin.generateLink returned no email_otp');
        await ctx2.close();
      } else {
        pass('OTP retrieved from admin API: ' + otpCode.replace(/.(?=.{2})/g, '•'));

        step('8.4 Type OTP into the form and submit');
        await otpPage.locator('input[inputmode=numeric]').fill(otpCode);
        await shoot(otpPage, '44-otp-code-entered');
        await otpPage.locator('button[type=submit]').click();
        // Should redirect to /account
        await otpPage.waitForURL((u) => u.toString().includes('/account'), { timeout: 10_000 });
        await otpPage.waitForLoadState('networkidle');
        await shoot(otpPage, '45-otp-signed-in');
        pass('OTP verified, redirected to /account');

        // Verify in DB
        const otpUser = await sb.auth.admin.listUsers();
        const created = (otpUser.data?.users || []).find((u) => u.email === otpEmail);
        if (created?.email_confirmed_at) pass('user.email_confirmed_at is set in auth.users');
        else fail('email confirmation', 'email_confirmed_at not set');

        // Cleanup
        if (created) await sb.auth.admin.deleteUser(created.id).catch(() => null);
        pass('OTP test user cleaned up');
      }
      await ctx2.close();
    }

    section('PHASE 9 — file upload (real binary upload to Supabase Storage)');
    {
      step('9.1 Prepare local photo fixture');
      const photoPath = await ensurePhotoFixture();
      pass('fixture ready: ' + photoPath);

      step('9.2 Open SchoolManage in main session');
      await page.bringToFront();
      await page.goto(FRONTEND + '/en/school/manage');
      await page.waitForLoadState('networkidle');

      step('9.3 Set the file on the hidden <input type=file> in the Create form');
      const fileInputs = page.locator('input[type=file]');
      const count = await fileInputs.count();
      if (count === 0) {
        fail('file upload', 'no file input on page');
      } else {
        await fileInputs.last().setInputFiles(photoPath);
        await page.waitForTimeout(3000); // allow signed-url + PUT to Supabase Storage to complete
        await shoot(page, '46-school-photo-uploaded');

        // Verify the upload actually landed in Supabase Storage under the user's folder.
        // Find a file uploaded in the last 60 seconds for this run.
        const since = new Date(Date.now() - 60_000).toISOString();
        const { data: rootList } = await sb.storage.from('school-photos').list('', {
          limit: 100, sortBy: { column: 'created_at', order: 'desc' },
        });
        let found = null;
        for (const folder of (rootList || [])) {
          if (folder.id) continue; // skip files at root
          const sub = await sb.storage.from('school-photos').list(folder.name, {
            limit: 10, sortBy: { column: 'created_at', order: 'desc' },
          });
          for (const f of (sub.data || [])) {
            if (f.created_at && f.created_at > since && f.metadata?.size > 0) {
              found = { folder: folder.name, file: f.name, size: f.metadata.size };
              break;
            }
          }
          if (found) break;
        }
        if (found) pass(`file uploaded → ${found.folder}/${found.file} (${found.size} bytes)`);
        else fail('file upload to storage', 'no recent upload found in school-photos bucket');
      }
    }

    section('PHASE 10 — mobile responsive (375x667)');
    await page.bringToFront();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(FRONTEND + '/en');
    await page.waitForLoadState('networkidle');
    await shoot(page, '39-mobile-home');
    await page.goto(FRONTEND + '/en/schools');
    await page.waitForLoadState('networkidle');
    await shoot(page, '40-mobile-schools');
    await page.goto(FRONTEND + '/en/donate');
    await page.waitForLoadState('networkidle');
    await shoot(page, '41-mobile-donate');
    pass('captured 3 mobile-width screenshots');

  } catch (e) {
    fail('FATAL', e.message + ' @ ' + page.url());
    await shoot(page, 'fatal-error');
    console.error(e);
  } finally {
    section('CONSOLE ERRORS');
    if (errors.length === 0) {
      pass('no console errors anywhere');
    } else {
      const real = errors.filter((e) =>
        !e.text.includes('com.chrome.devtools.json') &&
        // 401 on /api/auth/me is expected on every public page (AuthProvider probes session)
        !(e.text.includes('401') && (e.text.includes('auth/me') || e.text.match(/Failed to load resource.*401/i))),
      );
      if (real.length === 0) pass(`${errors.length} console messages, all are Chrome DevTools probes (ignorable)`);
      else {
        fail('console errors detected', real.length + ' real errors');
        for (const e of real.slice(0, 10)) {
          console.log('   • ' + e.url.replace(FRONTEND, '').replace(ADMIN, '[admin]') + ' :: ' + e.text.slice(0, 200));
        }
      }
    }

    section('CLEANUP');
    for (const did of cleanupDonationIds) await sb.from('donations').delete().eq('id', did);
    for (const sid of cleanupSchoolIds)   await sb.from('schools').delete().eq('id', sid);
    if (cleanupUserId) await sb.auth.admin.deleteUser(cleanupUserId).catch(() => null);
    pass(`cleaned ${cleanupDonationIds.length} donations, ${cleanupSchoolIds.length} schools, 1 user`);

    section('SUMMARY');
    console.log('  ✓ ' + passed + ' passed');
    if (failed > 0) {
      console.log('  ✗ ' + failed + ' failed');
      console.log('Failures:');
      for (const f of findings) console.log('  • ' + f.label + (f.detail ? ': ' + f.detail : ''));
    } else {
      console.log('  no failures.');
    }
    console.log('\nScreenshots saved under: test-screenshots/');
    console.log('Browser will stay open for 30 seconds so you can poke around.');

    await new Promise((r) => setTimeout(r, 30_000));
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
