// Full end-to-end test of every BookBridge flow.
// Run from project root: cd server && node scripts/full-flow-test.mjs
//
// Creates 3 fresh users (admin / donor / school-owner), exercises every
// API endpoint, prints a pass/fail line per check, then cleans up.

import 'dotenv/config';
import { supabaseAdmin, supabaseAuth } from '../lib/supabase.js';

const API = 'http://localhost:3001';

let passed = 0, failed = 0, warnings = 0;
const findings = [];

function pass(label) { passed++; console.log('  ✓ ' + label); }
function fail(label, detail) {
  failed++;
  findings.push({ severity: 'FAIL', label, detail });
  console.log('  ✗ ' + label + (detail ? ' — ' + detail : ''));
}
function warn(label, detail) {
  warnings++;
  findings.push({ severity: 'WARN', label, detail });
  console.log('  ⚠ ' + label + (detail ? ' — ' + detail : ''));
}
function section(title) { console.log('\n' + '═══ ' + title + ' ═══'); }

// ---- helpers: API requests as a given user (cookie session) ----

async function api(path, opts = {}, cookies = {}) {
  const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  const csrf = cookies.bb_csrf;
  const headers = {
    'Content-Type': 'application/json',
    ...(csrf ? { 'x-csrf-token': csrf } : {}),
    ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(API + path, { ...opts, headers });
  // Parse Set-Cookie headers
  const setCookies = {};
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.raw && res.headers.raw()['set-cookie']) || [];
  for (const h of sc) {
    const [pair] = h.split(';');
    const [k, v] = pair.split('=');
    setCookies[k.trim()] = v?.trim();
  }
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body, setCookies };
}

async function getCsrf() {
  const r = await api('/api/health');
  return r.setCookies.bb_csrf;
}

// ---- Create users via supabaseAdmin (bypasses email confirmation) ----

async function makeUser(email, password, username, role) {
  // Delete prior test user with same email
  const existing = await supabaseAdmin.auth.admin.listUsers();
  const prev = (existing.data?.users || []).find((u) => u.email === email);
  if (prev) await supabaseAdmin.auth.admin.deleteUser(prev.id);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, language: 'en' },
  });
  if (error) throw new Error('createUser: ' + error.message);

  // Update role (trigger sets default 'donor')
  if (role !== 'donor') {
    await supabaseAdmin.from('profiles').update({ role }).eq('id', data.user.id);
  }
  return data.user;
}

async function login(email, password) {
  const csrfRes = await api('/api/health');
  const csrf = csrfRes.setCookies.bb_csrf;
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, { bb_csrf: csrf });
  if (res.status !== 200) throw new Error('login failed: ' + JSON.stringify(res.body));
  return {
    bb_csrf: csrf,
    bb_session: res.setCookies.bb_session,
  };
}

// ============================================================
//  TEST RUN
// ============================================================

const RUN_ID = Date.now().toString(36);
const A = { email: `test-admin-${RUN_ID}@bookbridge.test`, pw: 'Admin12345!', username: `admin_${RUN_ID}` };
const D = { email: `test-donor-${RUN_ID}@bookbridge.test`, pw: 'Donor12345!', username: `donor_${RUN_ID}` };
const O = { email: `test-owner-${RUN_ID}@bookbridge.test`, pw: 'Owner12345!', username: `owner_${RUN_ID}` };

console.log('Run ID:', RUN_ID);

const cleanupIds = { users: [], schools: [], donations: [] };

try {
  section('A. Setup — create 3 test users');
  const admin = await makeUser(A.email, A.pw, A.username, 'admin');
  cleanupIds.users.push(admin.id); pass('admin user created · ' + admin.id.slice(0, 8));
  const donor = await makeUser(D.email, D.pw, D.username, 'donor');
  cleanupIds.users.push(donor.id); pass('donor user created · ' + donor.id.slice(0, 8));
  const owner = await makeUser(O.email, O.pw, O.username, 'donor');
  cleanupIds.users.push(owner.id); pass('school-owner user created · ' + owner.id.slice(0, 8));

  section('B. Login as each user');
  const adminCookies = await login(A.email, A.pw);
  pass('admin login → session token received');
  const donorCookies = await login(D.email, D.pw);
  pass('donor login → session token received');
  const ownerCookies = await login(O.email, O.pw);
  pass('school-owner login → session token received');

  section('C. Public endpoints (no auth)');
  const stats = await api('/api/stats');
  if (stats.status === 200 && typeof stats.body.books_delivered === 'number') pass('/api/stats');
  else fail('/api/stats', JSON.stringify(stats.body));

  const regions = await api('/api/regions');
  if (regions.status === 200 && Array.isArray(regions.body)) pass('/api/regions (' + regions.body.length + ' regions)');
  else fail('/api/regions', JSON.stringify(regions.body));

  const content = await api('/api/site-content');
  if (content.status === 200 && content.body && Object.keys(content.body).length > 0) {
    pass('/api/site-content (' + Object.keys(content.body).length + ' keys)');
  } else fail('/api/site-content', JSON.stringify(content.body));

  const leaderboard = await api('/api/leaderboard');
  if (leaderboard.status === 200) pass('/api/leaderboard (' + leaderboard.body.length + ' entries)');
  else fail('/api/leaderboard', JSON.stringify(leaderboard.body));

  const activity = await api('/api/activity');
  if (activity.status === 200) pass('/api/activity (' + activity.body.length + ' events)');
  else fail('/api/activity', JSON.stringify(activity.body));

  section('D. /api/auth/me');
  const meDonor = await api('/api/auth/me', {}, donorCookies);
  if (meDonor.status === 200 && meDonor.body.user?.profile?.username === D.username) {
    pass('/api/auth/me as donor returns full profile');
  } else fail('/api/auth/me as donor', JSON.stringify(meDonor.body));

  section('E. Edit profile (PUT /api/auth/me)');
  const editProfile = await api('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify({ full_name: 'Test Donor', city: 'Tbilisi', language: 'ka' }),
  }, donorCookies);
  if (editProfile.status === 200 && editProfile.body.profile?.city === 'Tbilisi') {
    pass('edit profile (full_name, city, language)');
  } else fail('edit profile', JSON.stringify(editProfile.body));

  const meAfter = await api('/api/auth/me', {}, donorCookies);
  if (meAfter.body.user?.profile?.city === 'Tbilisi') pass('profile changes persisted across requests');
  else fail('profile persistence', 'city not updated');

  section('F. School owner creates beneficiary school');
  const createSchool = await api('/api/schools', {
    method: 'POST',
    body: JSON.stringify({
      type: 'beneficiary',
      name: 'Test School ' + RUN_ID,
      region: 'Samtskhe-Javakheti',
      city: 'Adigeni',
      address: 'Test St 1',
      lat: 41.6786,
      lng: 42.6889,
      description: 'A test beneficiary school in the highlands.',
      contact_phone: '+995 555 555 555',
      contact_email: 'test@school.ge',
    }),
  }, ownerCookies);
  if (createSchool.status === 201 && createSchool.body.id) {
    pass('create beneficiary school (returns 201 with id, status=pending)');
    if (createSchool.body.status === 'pending') pass('  new school correctly defaults to status=pending');
    else fail('  new school status', createSchool.body.status);
  } else { fail('create school', JSON.stringify(createSchool.body)); throw new Error('cannot proceed without school'); }
  const schoolId = createSchool.body.id;
  cleanupIds.schools.push(schoolId);

  section('G. School not visible publicly until approved');
  const publicSchools = await api('/api/schools');
  if (publicSchools.body.find((s) => s.id === schoolId)) {
    fail('public school list', 'pending school visible to anons — should be hidden until approved');
  } else pass('pending school correctly hidden from public list');

  section('H. Admin approves the school');
  const approve = await api('/api/admin/schools/' + schoolId + '/approval', {
    method: 'POST',
    body: JSON.stringify({ status: 'approved' }),
  }, adminCookies);
  if (approve.status === 200 && approve.body.status === 'approved') pass('admin approves school');
  else fail('approve school', JSON.stringify(approve.body));

  section('I. Approved school now appears publicly');
  const publicSchoolsAfter = await api('/api/schools');
  if (publicSchoolsAfter.body.find((s) => s.id === schoolId)) pass('approved school visible in public list');
  else fail('public school list after approval', 'school not in list');

  const schoolDetail = await api('/api/schools/' + schoolId);
  if (schoolDetail.status === 200 && schoolDetail.body.name) pass('GET /api/schools/:id (school detail)');
  else fail('school detail', JSON.stringify(schoolDetail.body));

  section('J. School owner edits school');
  const editSchool = await api('/api/schools/' + schoolId, {
    method: 'PUT',
    body: JSON.stringify({ description: 'Updated description', contact_phone: '+995 555 555 666' }),
  }, ownerCookies);
  if (editSchool.status === 200 && editSchool.body.description === 'Updated description') pass('owner can edit own school');
  else fail('edit school', JSON.stringify(editSchool.body));

  section('K. School owner adds book requests');
  const req1 = await api('/api/schools/' + schoolId + '/book-requests', {
    method: 'POST',
    body: JSON.stringify({
      request_type: 'title', title: 'Master and Margarita',
      quantity_needed: 3,
    }),
  }, ownerCookies);
  if (req1.status === 201) pass('add book request (title)');
  else fail('add book request', JSON.stringify(req1.body));
  const req1Id = req1.body.id;

  const req2 = await api('/api/schools/' + schoolId + '/book-requests', {
    method: 'POST',
    body: JSON.stringify({ request_type: 'genre', genre: 'Science Fiction', quantity_needed: 5 }),
  }, ownerCookies);
  if (req2.status === 201) pass('add book request (genre)');
  else fail('add book request 2', JSON.stringify(req2.body));

  const reqs = await api('/api/schools/' + schoolId + '/book-requests');
  if (reqs.body.length === 2) pass('list book requests (2 returned)');
  else fail('list book requests', 'expected 2, got ' + reqs.body.length);

  section('L. Donor creates a donation');
  const donate = await api('/api/donations', {
    method: 'POST',
    body: JSON.stringify({
      beneficiary_school_id: schoolId,
      delivery_method: 'courier',
      donor_address: 'Test donor address',
      items: [
        { matched_request_id: req1Id, book_title: 'Master and Margarita', quantity: 2 },
        { book_title: 'Custom Book', quantity: 1 },
      ],
    }),
  }, donorCookies);
  if (donate.status === 201 && donate.body.id) {
    pass('donor creates donation (returns 201 with track_token)');
    cleanupIds.donations.push(donate.body.id);
  } else { fail('create donation', JSON.stringify(donate.body)); throw new Error('cannot proceed without donation'); }
  const donationId = donate.body.id;
  const trackToken = donate.body.track_token;

  section('M. Tracking + donor self-list');
  const trackPublic = await api('/api/donations/track/' + trackToken);
  if (trackPublic.status === 200 && trackPublic.body.donor_user_id === undefined) {
    pass('public tracking redacts donor_user_id');
  } else fail('public tracking', 'donor_user_id leaked or missing donation');

  const myDonations = await api('/api/donations/me', {}, donorCookies);
  if (myDonations.body.find((d) => d.id === donationId)) pass('donor sees their donation in /api/donations/me');
  else fail('donor self-list', 'donation not in list');

  section('N. Admin donation status updates');
  const transitions = ['at_volunteer', 'in_transit', 'delivered'];
  for (const status of transitions) {
    const upd = await api('/api/admin/donations/' + donationId + '/status', {
      method: 'POST',
      body: JSON.stringify({ status, courier_tracking_id: status === 'in_transit' ? 'TEST-' + RUN_ID : undefined }),
    }, adminCookies);
    if (upd.status === 200 && upd.body.status === status) pass('admin updates status → ' + status);
    else fail('admin update → ' + status, JSON.stringify(upd.body));
  }

  // Check status history
  const detailAdmin = await api('/api/admin/donations/' + donationId, {}, adminCookies);
  const history = detailAdmin.body?.donation_status_history || [];
  if (history.length >= 4) pass('status history has ' + history.length + ' entries (create + 3 transitions)');
  else warn('status history', 'only ' + history.length + ' entries, expected >= 4');

  section('O. Trigger fires: book_request.quantity_fulfilled');
  const reqsAfterDelivery = await api('/api/schools/' + schoolId + '/book-requests');
  const masterReq = reqsAfterDelivery.body.find((r) => r.id === req1Id);
  if (masterReq?.quantity_fulfilled === 2) pass('quantity_fulfilled trigger fired (req fulfilled=2)');
  else fail('quantity_fulfilled trigger', 'expected 2, got ' + masterReq?.quantity_fulfilled);

  section('P. Leaderboard reflects delivered donation');
  const lbAfter = await api('/api/leaderboard');
  const lbEntry = (lbAfter.body || []).find((e) => e.username === D.username);
  if (lbEntry && lbEntry.total_books === 3) pass('donor appears in leaderboard with 3 books');
  else fail('leaderboard reflection', JSON.stringify(lbEntry || 'not found'));

  section('Q. Activity feed contains donation events');
  const actAfter = await api('/api/activity', {}, {});
  const hasCreated = actAfter.body.find((e) => e.kind === 'donation_created' && e.ref_id === donationId);
  const hasDelivered = actAfter.body.find((e) => e.kind === 'donation_delivered' && e.ref_id === donationId);
  if (hasCreated) pass('activity has donation_created event'); else fail('activity feed missing donation_created');
  if (hasDelivered) pass('activity has donation_delivered event'); else fail('activity feed missing donation_delivered');

  section('R. Stats reflect delivery');
  const statsAfter = await api('/api/stats');
  if (statsAfter.body.books_delivered >= 3) pass('stats.books_delivered ≥ 3 (' + statsAfter.body.books_delivered + ')');
  else fail('stats books_delivered', 'expected >=3, got ' + statsAfter.body.books_delivered);
  if (statsAfter.body.beneficiary_schools >= 1) pass('stats.beneficiary_schools ≥ 1');
  else fail('stats beneficiary_schools', 'expected >=1');

  section('S. Region in /api/regions');
  const regionsAfter = await api('/api/regions');
  const hasSamtskhe = regionsAfter.body.find((r) => r.region === 'Samtskhe-Javakheti');
  if (hasSamtskhe) pass('region "Samtskhe-Javakheti" appears in /api/regions');
  else fail('regions endpoint', 'new region not picked up');

  section('T. Cancel donation flow');
  // Create another donation and immediately cancel it
  const donate2 = await api('/api/donations', {
    method: 'POST',
    body: JSON.stringify({
      beneficiary_school_id: schoolId,
      delivery_method: 'self',
      items: [{ book_title: 'To Cancel', quantity: 1 }],
    }),
  }, donorCookies);
  if (donate2.status === 201) {
    cleanupIds.donations.push(donate2.body.id);
    pass('second donation created (for cancel test)');
    const cancel = await api('/api/donations/' + donate2.body.id + '/cancel', {
      method: 'POST', body: JSON.stringify({}),
    }, donorCookies);
    if (cancel.status === 200 && cancel.body.status === 'cancelled') pass('donor cancels their donation');
    else fail('cancel donation', JSON.stringify(cancel.body));
  } else fail('create second donation', JSON.stringify(donate2.body));

  section('U. Site content CMS (admin)');
  const ct = await api('/api/admin/content', {}, adminCookies);
  if (ct.status === 200 && Array.isArray(ct.body)) pass('GET /api/admin/content (' + ct.body.length + ' keys)');
  else fail('site content admin GET', JSON.stringify(ct.body));

  const ctPut = await api('/api/admin/content', {
    method: 'PUT',
    body: JSON.stringify({ key: 'hero.slogan', value_en: 'Test slogan ' + RUN_ID, value_ka: 'ტესტ' }),
  }, adminCookies);
  if (ctPut.status === 200) pass('PUT /api/admin/content updates a key');
  else fail('site content PUT', JSON.stringify(ctPut.body));

  section('V. Search');
  const search = await api('/api/search?q=Test%20School&type=all');
  if (search.status === 200 && search.body.schools?.find((s) => s.id === schoolId)) {
    pass('search finds school by name');
  } else fail('search', JSON.stringify(search.body));

  section('W. Volunteer + school-owner endpoints');
  const myV = await api('/api/volunteer/my-schools', {}, ownerCookies);
  if (myV.status === 200 && Array.isArray(myV.body)) pass('GET /api/volunteer/my-schools (' + myV.body.length + ' schools)');
  else fail('volunteer my-schools', JSON.stringify(myV.body));

  // Negative test: unrelated user can't update donation status
  const unauthorized = await api('/api/admin/donations/' + donationId + '/status', {
    method: 'POST', body: JSON.stringify({ status: 'pending' }),
  }, donorCookies);
  if (unauthorized.status === 403) pass('non-admin correctly rejected (403) on admin endpoint');
  else fail('admin authz', 'expected 403, got ' + unauthorized.status);

  section('X. Auth boundaries');
  const noCookie = await api('/api/auth/me');
  if (noCookie.status === 401) pass('/api/auth/me without session → 401');
  else fail('auth boundary /me', 'expected 401, got ' + noCookie.status);

  const noCsrf = await api('/api/auth/logout', { method: 'POST' });
  if (noCsrf.status === 403) pass('POST without CSRF header → 403');
  else fail('csrf boundary logout', 'expected 403, got ' + noCsrf.status);

  section('Y. Storage upload sign');
  const sign = await api('/api/storage/sign-upload', {
    method: 'POST',
    body: JSON.stringify({ bucket: 'school-photos', filename: 'test.jpg' }),
  }, ownerCookies);
  if (sign.status === 200 && sign.body.signed_url) pass('signed upload URL returned');
  else fail('storage sign-upload', JSON.stringify(sign.body));

} catch (e) {
  fail('FATAL', e.message);
} finally {
  // ---- cleanup ----
  console.log('\n═══ CLEANUP ═══');
  for (const did of cleanupIds.donations) {
    await supabaseAdmin.from('donations').delete().eq('id', did);
  }
  for (const sid of cleanupIds.schools) {
    await supabaseAdmin.from('schools').delete().eq('id', sid);
  }
  for (const uid of cleanupIds.users) {
    await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => null);
  }
  console.log('  ✓ cleaned up ' + cleanupIds.donations.length + ' donations, ' + cleanupIds.schools.length + ' schools, ' + cleanupIds.users.length + ' users');

  // ---- summary ----
  console.log('\n═══ SUMMARY ═══');
  console.log('  ✓ ' + passed + ' passed');
  if (warnings > 0) console.log('  ⚠ ' + warnings + ' warnings');
  if (failed > 0) {
    console.log('  ✗ ' + failed + ' FAILED');
    console.log('\nFailures:');
    for (const f of findings) {
      if (f.severity === 'FAIL') console.log('  • ' + f.label + (f.detail ? ': ' + f.detail : ''));
    }
  } else {
    console.log('  no failures.');
  }

  process.exit(failed > 0 ? 1 : 0);
}
