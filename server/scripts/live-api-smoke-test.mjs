// Live API smoke / integration test for the BookBridge backend.
//
// Targets the LIVE deployment by default:
//   https://book-bridge-api.vercel.app
// Override with:  API_BASE=http://localhost:3001 node scripts/live-api-smoke-test.mjs
//
// SAFETY: This suite is READ-ONLY / idempotent. It never creates donations,
// schools, or real signups. The only writes it performs are:
//   - register attempts using a clearly-marked, deliberately INVALID payload
//     (short password) so they are REJECTED before any account is created, and
//   - a login attempt with bogus credentials that is expected to FAIL.
// No throwaway accounts are ever created.
//
// Run from the server directory:  node scripts/live-api-smoke-test.mjs
// Needs no env file and no heavy deps — uses Node 18+ built-in fetch.

const API = (process.env.API_BASE || 'https://book-bridge-api.vercel.app').replace(/\/$/, '');

// ---- result tracking ----
let passed = 0, failed = 0, warnings = 0;
const rows = []; // { name, method, path, status, expected, result, detail }

function record(result, name, info) {
  if (result === 'PASS') passed++;
  else if (result === 'WARN') warnings++;
  else failed++;
  rows.push({ result, name, ...info });
  const icon = result === 'PASS' ? 'PASS' : result === 'WARN' ? 'WARN' : 'FAIL';
  const detail = info.detail ? '  — ' + info.detail : '';
  console.log(`  [${icon}] ${name} (${info.method} ${info.path} -> ${info.status})${detail}`);
}
function pass(name, info) { record('PASS', name, info); }
function fail(name, info) { record('FAIL', name, info); }
function warn(name, info) { record('WARN', name, info); }
function section(title) { console.log('\n=== ' + title + ' ==='); }

// ---- HTTP helper that tracks cookies + CSRF, like the SPA does ----

function parseSetCookies(res) {
  const out = {};
  const getter = res.headers.getSetCookie?.bind(res.headers);
  const list = getter ? getter() : [];
  for (const h of list) {
    const [pair] = h.split(';');
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return out;
}

async function api(path, opts = {}, cookies = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`).join('; ');
  const csrf = cookies.bb_csrf;
  const headers = {
    'Content-Type': 'application/json',
    ...(csrf ? { 'x-csrf-token': csrf } : {}),
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(API + path, { ...opts, headers, redirect: 'manual' });
  const setCookies = parseSetCookies(res);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return {
    status: res.status,
    body,
    setCookies,
    csrfHeader: res.headers.get('x-csrf-token'),
  };
}

// Grab a fresh CSRF token the same way the frontend does — from a GET response.
async function freshCsrf() {
  const r = await api('/api/health');
  return r.setCookies.bb_csrf || r.csrfHeader;
}

function isArray(v) { return Array.isArray(v); }
// The strict per-route limiter (5/min) on /register, /login, etc. can return 429
// when the suite is re-run within the same minute. A 429 still proves the endpoint
// and its limiter are wired correctly, so treat it as an acceptable outcome rather
// than a hard failure to keep the suite idempotent and re-runnable.
function rateLimited(r) { return r.status === 429 && r.body?.error === 'rate_limited'; }
function summarize(body, max = 160) {
  try {
    const s = typeof body === 'string' ? body : JSON.stringify(body);
    return s.length > max ? s.slice(0, max) + '…' : s;
  } catch { return String(body); }
}

// ============================================================
//  RUN
// ============================================================

console.log('BookBridge live API smoke test');
console.log('Target:', API);
console.log('Mode:  READ-ONLY (no donations / schools / signups created)\n');

try {
  // ---------------------------------------------------------
  section('1. Health & infrastructure');
  // ---------------------------------------------------------
  {
    const r = await api('/api/health');
    const ok = r.status === 200 && r.body?.status === 'ok' && typeof r.body.uptime_s === 'number';
    (ok ? pass : fail)('health returns {status:ok, uptime_s, node}',
      { method: 'GET', path: '/api/health', status: r.status, detail: ok ? r.body.node : summarize(r.body) });

    // CSRF token must round-trip via both Set-Cookie and the x-csrf-token header.
    const hasCookie = !!r.setCookies.bb_csrf;
    const hasHeader = !!r.csrfHeader;
    const matches = hasCookie && hasHeader && r.setCookies.bb_csrf === r.csrfHeader;
    (matches ? pass : warn)('CSRF token issued on GET (cookie === x-csrf-token header)',
      { method: 'GET', path: '/api/health', status: r.status,
        detail: matches ? 'cookie/header match' : `cookie=${hasCookie} header=${hasHeader}` });
  }

  // ---------------------------------------------------------
  section('2. Public read endpoints (no auth)');
  // ---------------------------------------------------------
  {
    const r = await api('/api/stats');
    const ok = r.status === 200 &&
      typeof r.body?.books_delivered === 'number' &&
      typeof r.body?.beneficiary_schools === 'number';
    (ok ? pass : fail)('stats returns numeric counters',
      { method: 'GET', path: '/api/stats', status: r.status,
        detail: ok ? `books_delivered=${r.body.books_delivered}, beneficiary_schools=${r.body.beneficiary_schools}` : summarize(r.body) });
  }
  {
    const r = await api('/api/schools');
    const ok = r.status === 200 && isArray(r.body);
    (ok ? pass : fail)('schools returns an array (approved only)',
      { method: 'GET', path: '/api/schools', status: r.status,
        detail: ok ? `${r.body.length} schools` : summarize(r.body) });
    if (ok && r.body.length) {
      const allApproved = r.body.every((s) => s.status === 'approved' || s.status === undefined);
      (allApproved ? pass : fail)('public school list exposes only approved schools',
        { method: 'GET', path: '/api/schools', status: r.status,
          detail: allApproved ? 'no pending/rejected leaked' : 'non-approved school in public list' });
    }
  }
  {
    const r = await api('/api/schools?type=beneficiary');
    const ok = r.status === 200 && isArray(r.body) &&
      r.body.every((s) => s.type === 'beneficiary');
    (ok ? pass : fail)('schools?type=beneficiary filter honored',
      { method: 'GET', path: '/api/schools?type=beneficiary', status: r.status,
        detail: ok ? `${r.body.length} beneficiary schools` : summarize(r.body) });
  }
  {
    const r = await api('/api/schools?type=volunteer');
    const ok = r.status === 200 && isArray(r.body) &&
      r.body.every((s) => s.type === 'volunteer');
    (ok ? pass : fail)('schools?type=volunteer filter honored',
      { method: 'GET', path: '/api/schools?type=volunteer', status: r.status,
        detail: ok ? `${r.body.length} volunteer schools` : summarize(r.body) });
  }
  let regionForFilter = null;
  {
    const r = await api('/api/regions');
    const ok = r.status === 200 && isArray(r.body) &&
      r.body.every((x) => typeof x.region === 'string' && typeof x.count === 'number');
    (ok ? pass : fail)('regions returns [{region, count}]',
      { method: 'GET', path: '/api/regions', status: r.status,
        detail: ok ? `${r.body.length} regions` : summarize(r.body) });
    if (ok && r.body.length) regionForFilter = r.body[0].region;
  }
  if (regionForFilter) {
    const enc = encodeURIComponent(regionForFilter);
    const r = await api('/api/schools?region=' + enc);
    const ok = r.status === 200 && isArray(r.body) &&
      r.body.every((s) => s.region === regionForFilter);
    (ok ? pass : fail)(`schools?region=${regionForFilter} filter honored`,
      { method: 'GET', path: '/api/schools?region=' + enc, status: r.status,
        detail: ok ? `${r.body.length} schools in region` : summarize(r.body) });
  }
  {
    const r = await api('/api/site-content');
    const ok = r.status === 200 && r.body && typeof r.body === 'object' && !isArray(r.body);
    (ok ? pass : fail)('site-content returns a keyed object',
      { method: 'GET', path: '/api/site-content', status: r.status,
        detail: ok ? `${Object.keys(r.body).length} keys` : summarize(r.body) });
  }
  {
    const r = await api('/api/leaderboard');
    const ok = r.status === 200 && isArray(r.body);
    (ok ? pass : fail)('leaderboard returns an array',
      { method: 'GET', path: '/api/leaderboard', status: r.status,
        detail: ok ? `${r.body.length} entries` : summarize(r.body) });
  }
  {
    const r = await api('/api/leaderboard?limit=3');
    const ok = r.status === 200 && isArray(r.body) && r.body.length <= 3;
    (ok ? pass : fail)('leaderboard?limit=3 caps results',
      { method: 'GET', path: '/api/leaderboard?limit=3', status: r.status,
        detail: ok ? `${r.body.length} entries (<=3)` : summarize(r.body) });
  }
  {
    const r = await api('/api/activity');
    const ok = r.status === 200 && isArray(r.body);
    (ok ? pass : fail)('activity returns an array',
      { method: 'GET', path: '/api/activity', status: r.status,
        detail: ok ? `${r.body.length} events` : summarize(r.body) });
  }

  // ---------------------------------------------------------
  section('3. Search');
  // ---------------------------------------------------------
  {
    const r = await api('/api/search?q=school&type=all');
    const ok = r.status === 200 && r.body && typeof r.body === 'object';
    (ok ? pass : fail)('search?q=school&type=all returns a result object',
      { method: 'GET', path: '/api/search?q=school&type=all', status: r.status,
        detail: ok ? `keys: ${Object.keys(r.body).join(',')}` : summarize(r.body) });
  }
  {
    const r = await api('/api/search?q=a&type=beneficiary');
    const ok = r.status === 200 && r.body && typeof r.body === 'object';
    (ok ? pass : fail)('search with type=beneficiary returns 200',
      { method: 'GET', path: '/api/search?q=a&type=beneficiary', status: r.status,
        detail: ok ? 'ok' : summarize(r.body) });
  }
  {
    // Missing required q -> Zod validation should reject with 400.
    const r = await api('/api/search');
    const ok = r.status === 400;
    (ok ? pass : fail)('search without q rejected (400, schema validation)',
      { method: 'GET', path: '/api/search', status: r.status,
        detail: ok ? 'rejected as expected' : 'expected 400 — ' + summarize(r.body) });
  }
  {
    // Invalid type enum -> 400.
    const r = await api('/api/search?q=x&type=bogus');
    const ok = r.status === 400;
    (ok ? pass : fail)('search with invalid type enum rejected (400)',
      { method: 'GET', path: '/api/search?q=x&type=bogus', status: r.status,
        detail: ok ? 'rejected as expected' : 'expected 400 — ' + summarize(r.body) });
  }

  // ---------------------------------------------------------
  section('4. Auth — unauthenticated boundaries');
  // ---------------------------------------------------------
  {
    // /me is intentionally 200 + {user:null} for anonymous callers.
    const r = await api('/api/auth/me');
    const ok = r.status === 200 && r.body?.user === null;
    (ok ? pass : fail)('auth/me anonymous -> 200 {user:null}',
      { method: 'GET', path: '/api/auth/me', status: r.status,
        detail: ok ? 'anonymous probe ok' : 'expected 200 {user:null} — ' + summarize(r.body) });
  }
  {
    // Protected endpoint requires auth.
    const r = await api('/api/donations/me');
    const ok = r.status === 401;
    (ok ? pass : fail)('donations/me without session -> 401',
      { method: 'GET', path: '/api/donations/me', status: r.status,
        detail: ok ? 'unauthorized as expected' : 'expected 401 — ' + summarize(r.body) });
  }
  {
    // Admin endpoint requires auth (401 before role check).
    const r = await api('/api/admin/schools/pending');
    const ok = r.status === 401 || r.status === 403;
    (ok ? pass : fail)('admin/schools/pending without session -> 401/403',
      { method: 'GET', path: '/api/admin/schools/pending', status: r.status,
        detail: ok ? 'blocked as expected' : 'expected 401/403 — ' + summarize(r.body) });
  }

  // ---------------------------------------------------------
  section('5. CSRF enforcement on unsafe methods');
  // ---------------------------------------------------------
  {
    // POST without any CSRF cookie/header must be rejected with 403.
    const r = await api('/api/auth/logout', { method: 'POST', body: '{}' });
    const ok = r.status === 403 && r.body?.error === 'csrf_mismatch';
    (ok ? pass : fail)('POST logout without CSRF -> 403 csrf_mismatch',
      { method: 'POST', path: '/api/auth/logout', status: r.status,
        detail: ok ? 'csrf enforced' : 'expected 403 csrf_mismatch — ' + summarize(r.body) });
  }
  {
    // Mismatched CSRF cookie vs header must be rejected.
    const r = await api('/api/auth/logout',
      { method: 'POST', body: '{}' },
      { bb_csrf: 'cookie-value' });
    // Provide a header that does NOT match the cookie.
    const res = await fetch(API + '/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: 'bb_csrf=cookie-value', 'x-csrf-token': 'different-header' },
      body: '{}', redirect: 'manual',
    });
    const ok = res.status === 403;
    (ok ? pass : fail)('POST logout with mismatched CSRF cookie/header -> 403',
      { method: 'POST', path: '/api/auth/logout', status: res.status,
        detail: ok ? 'mismatch rejected' : 'expected 403' });
    void r;
  }
  {
    // Matching CSRF cookie + header should clear the auth boundary and succeed
    // (logout is idempotent and creates no data).
    const csrf = await freshCsrf();
    const r = await api('/api/auth/logout', { method: 'POST', body: '{}' }, { bb_csrf: csrf });
    const ok = r.status === 200 && r.body?.ok === true;
    (ok ? pass : fail)('POST logout with valid CSRF -> 200 {ok:true}',
      { method: 'POST', path: '/api/auth/logout', status: r.status,
        detail: ok ? 'csrf round-trip works' : summarize(r.body) });
  }

  // ---------------------------------------------------------
  section('6. Auth — register/login validation (no accounts created)');
  // ---------------------------------------------------------
  {
    // Login with bogus credentials -> 401 (expected failure, no account created).
    const csrf = await freshCsrf();
    const r = await api('/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email: `nobody-${Date.now()}@bookbridge.invalid`, password: 'definitely-wrong-pass' }) },
      { bb_csrf: csrf });
    const ok = r.status === 401 || r.status === 403; // 403 if email-not-confirmed path, 401 normally
    if (rateLimited(r)) warn('login with bogus credentials -> 401 (skipped: rate-limited)',
      { method: 'POST', path: '/api/auth/login', status: r.status, detail: 'strict limiter active — re-run after 60s' });
    else (ok ? pass : fail)('login with bogus credentials -> 401',
      { method: 'POST', path: '/api/auth/login', status: r.status,
        detail: ok ? 'invalid login rejected' : 'expected 401 — ' + summarize(r.body) });
  }
  {
    // Login missing password -> 400 schema validation.
    const csrf = await freshCsrf();
    const r = await api('/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email: 'someone@example.com' }) },
      { bb_csrf: csrf });
    const ok = r.status === 400;
    if (rateLimited(r)) warn('login missing password -> 400 (skipped: rate-limited)',
      { method: 'POST', path: '/api/auth/login', status: r.status, detail: 'strict limiter active — re-run after 60s' });
    else (ok ? pass : fail)('login missing password -> 400 (schema)',
      { method: 'POST', path: '/api/auth/login', status: r.status,
        detail: ok ? 'validation rejected' : 'expected 400 — ' + summarize(r.body) });
  }
  {
    // Register with an intentionally INVALID payload (password too short) must be
    // rejected by schema validation BEFORE any Supabase signUp is attempted.
    // This guarantees no throwaway account is created.
    const csrf = await freshCsrf();
    const r = await api('/api/auth/register',
      { method: 'POST', body: JSON.stringify({
          email: `qa-invalid-${Date.now()}@bookbridge.invalid`,
          username: 'qa_smoke_invalid',
          password: 'short',          // < 8 chars -> RegisterSchema rejects
          language: 'en',
        }) },
      { bb_csrf: csrf });
    const ok = r.status === 400;
    if (rateLimited(r)) warn('register short password -> 400 (skipped: rate-limited)',
      { method: 'POST', path: '/api/auth/register', status: r.status, detail: 'strict limiter active — re-run after 60s' });
    else (ok ? pass : fail)('register with short password -> 400 (no account created)',
      { method: 'POST', path: '/api/auth/register', status: r.status,
        detail: ok ? 'validation rejected before signup' : 'expected 400 — ' + summarize(r.body) });
  }
  {
    // Register without CSRF -> 403 (CSRF checked before validation/signup).
    const r = await api('/api/auth/register',
      { method: 'POST', body: JSON.stringify({
          email: 'x@bookbridge.invalid', username: 'qa_nocsrf', password: 'longenough123', language: 'en',
        }) });
    const ok = r.status === 403;
    if (rateLimited(r)) warn('register without CSRF -> 403 (skipped: rate-limited)',
      { method: 'POST', path: '/api/auth/register', status: r.status, detail: 'strict limiter ran before csrf — re-run after 60s' });
    else (ok ? pass : fail)('register without CSRF -> 403',
      { method: 'POST', path: '/api/auth/register', status: r.status,
        detail: ok ? 'csrf enforced on register' : 'expected 403 — ' + summarize(r.body) });
  }

  // ---------------------------------------------------------
  section('7. Not-found & error handling');
  // ---------------------------------------------------------
  {
    const r = await api('/api/this-route-does-not-exist');
    const ok = r.status === 404 && r.body?.error === 'not_found';
    (ok ? pass : fail)('unknown /api route -> 404 {error:not_found}',
      { method: 'GET', path: '/api/this-route-does-not-exist', status: r.status,
        detail: ok ? '404 handler works' : summarize(r.body) });
  }
  {
    // Random tracking token -> 404 (token does not exist).
    const r = await api('/api/donations/track/nonexistent-token-' + Date.now());
    const ok = r.status === 404 && r.body?.error === 'not_found';
    (ok ? pass : fail)('donations/track/:token unknown -> 404',
      { method: 'GET', path: '/api/donations/track/<bogus>', status: r.status,
        detail: ok ? 'unknown token handled' : 'expected 404 — ' + summarize(r.body) });
  }
  {
    // Unknown school id -> 404 (not approved / not found).
    const r = await api('/api/schools/00000000-0000-0000-0000-000000000000');
    const ok = r.status === 404;
    (ok ? pass : fail)('schools/:id unknown uuid -> 404',
      { method: 'GET', path: '/api/schools/<zero-uuid>', status: r.status,
        detail: ok ? 'unknown school handled' : 'expected 404 — ' + summarize(r.body) });
  }

} catch (e) {
  fail('FATAL — unexpected error during run', { method: '-', path: '-', status: '-', detail: e.message });
}

// ============================================================
//  SUMMARY TABLE
// ============================================================
console.log('\n=== RESULTS TABLE ===');
const w = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(w('RESULT', 6) + ' | ' + w('STATUS', 6) + ' | ' + w('METHOD', 6) + ' | ' + w('PATH', 42) + ' | NAME');
console.log('-'.repeat(110));
for (const row of rows) {
  console.log(
    w(row.result, 6) + ' | ' +
    w(row.status, 6) + ' | ' +
    w(row.method, 6) + ' | ' +
    w(row.path, 42) + ' | ' +
    row.name,
  );
}

console.log('\n=== SUMMARY ===');
console.log(`  ${passed} passed, ${warnings} warnings, ${failed} failed (of ${rows.length} checks)`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const row of rows.filter((r) => r.result === 'FAIL')) {
    console.log(`  - ${row.name}: ${row.method} ${row.path} -> ${row.status}${row.detail ? '  (' + row.detail + ')' : ''}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
