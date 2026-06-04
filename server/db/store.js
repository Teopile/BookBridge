// All Supabase queries live here. Routes call these helpers; they don't touch supabaseAdmin directly.

import { supabaseAdmin } from '../lib/supabase.js';
import { buildIlikeOr } from './queryHelpers.js';

// Pure helper, re-exported so existing importers keep getting it from store.js.
export { buildIlikeOr };

// ---------- schools ----------

export async function listApprovedSchools({ type, region, limit = 50 } = {}) {
  let q = supabaseAdmin
    .from('schools')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (type) q = q.eq('type', type);
  if (region) q = q.eq('region', region);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getSchoolById(id) {
  const { data, error } = await supabaseAdmin
    .from('schools').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createSchool(ownerUserId, payload) {
  const { data, error } = await supabaseAdmin
    .from('schools').insert({ ...payload, owner_user_id: ownerUserId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSchool(id, patch) {
  const { data, error } = await supabaseAdmin
    .from('schools').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function listPendingSchools() {
  const { data, error } = await supabaseAdmin
    .from('schools').select('*').eq('status', 'pending').order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

// ---------- book_requests ----------

export async function listBookRequests(schoolId) {
  const { data, error } = await supabaseAdmin
    .from('book_requests').select('*').eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createBookRequest(payload) {
  const { data, error } = await supabaseAdmin
    .from('book_requests').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBookRequest(id) {
  const { error } = await supabaseAdmin.from('book_requests').delete().eq('id', id);
  if (error) throw error;
}

// ---------- donations ----------

export async function createDonation(donorUserId, payload) {
  const { items, ...donation } = payload;
  const { data: created, error } = await supabaseAdmin
    .from('donations').insert({ ...donation, donor_user_id: donorUserId }).select().single();
  if (error) throw error;

  if (items?.length) {
    const withId = items.map((i) => ({ ...i, donation_id: created.id }));
    const { error: e2 } = await supabaseAdmin.from('donation_items').insert(withId);
    if (e2) throw e2;
  }

  await supabaseAdmin.from('donation_status_history').insert({
    donation_id: created.id,
    from_status: null,
    to_status: created.status,
    changed_by: donorUserId,
    note: 'donation created',
  });

  return created;
}

// Attach courier details after a shipment is booked. Kept separate from
// createDonation so the donation is durable even when courier booking fails.
export async function setDonationCourier(donationId, provider, trackingId) {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .update({ courier_provider: provider, courier_tracking_id: trackingId })
    .eq('id', donationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDonation(id) {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .select('*, donation_items(*), donation_status_history(*)')
    .eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDonationByTrackToken(token) {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .select('*, donation_items(*), donation_status_history(*)')
    .eq('track_token', token).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listDonationsForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('donations').select('*, donation_items(*)').eq('donor_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateDonationStatus(donationId, newStatus, changedBy, note, courierTrackingId) {
  const { data: current, error: e1 } = await supabaseAdmin
    .from('donations').select('status').eq('id', donationId).single();
  if (e1) throw e1;

  const patch = { status: newStatus };
  if (courierTrackingId) patch.courier_tracking_id = courierTrackingId;

  const { data, error } = await supabaseAdmin
    .from('donations').update(patch).eq('id', donationId).select().single();
  if (error) throw error;

  await supabaseAdmin.from('donation_status_history').insert({
    donation_id: donationId,
    from_status: current.status,
    to_status: newStatus,
    changed_by: changedBy,
    note,
  });

  // When a donation first becomes delivered, credit any matched book requests so
  // the school's wishlist "fulfilled" counts reflect real deliveries.
  if (newStatus === 'delivered' && current.status !== 'delivered') {
    try { await applyFulfillment(donationId); }
    catch (e) { console.error('[store] applyFulfillment failed:', e.message); }
  }

  return data;
}

// Increment quantity_fulfilled on the book requests matched by this donation's
// items, capped at quantity_needed. Best-effort; never blocks the status update.
async function applyFulfillment(donationId) {
  const { data: items } = await supabaseAdmin
    .from('donation_items')
    .select('matched_request_id, quantity')
    .eq('donation_id', donationId)
    .not('matched_request_id', 'is', null);
  for (const it of items || []) {
    const { data: req } = await supabaseAdmin
      .from('book_requests')
      .select('quantity_needed, quantity_fulfilled')
      .eq('id', it.matched_request_id)
      .maybeSingle();
    if (!req) continue;
    const next = Math.min((req.quantity_fulfilled || 0) + (it.quantity || 0), req.quantity_needed || 0);
    await supabaseAdmin.from('book_requests').update({ quantity_fulfilled: next }).eq('id', it.matched_request_id);
  }
}

// Allowed forward transitions of the donation lifecycle. Admins bypass this
// (they can correct a status), but the volunteer hub and the receiving school
// are held to it so the pipeline can't skip or rewind steps.
//
// The rules + canTransition() live in a pure, Supabase-free module so they can
// be unit-tested without instantiating a client. Re-exported here to keep
// store.js's public API unchanged for existing importers.
export { DONATION_TRANSITIONS, canTransition } from './transitions.js';

// ---------- monetary_donations ----------

export async function createMonetaryDonation(donorUserId, payload) {
  const { data, error } = await supabaseAdmin
    .from('monetary_donations').insert({ ...payload, donor_user_id: donorUserId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateMonetaryDonationStatus(id, status, providerPaymentId) {
  const { data, error } = await supabaseAdmin
    .from('monetary_donations')
    .update({ status, provider_payment_id: providerPaymentId })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ---------- notifications ----------

export async function recordNotification(payload) {
  const { data, error } = await supabaseAdmin.from('notifications').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// ---------- in-app (in-website) notifications ----------

// Record a user-facing in-app notification. Reuses the notifications table with
// channel='in_app' and an unread read_at. Safe no-op if there's no user.
export async function createInAppNotification(userId, donationId, subject, body) {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin.from('notifications').insert({
    user_id: userId, donation_id: donationId, channel: 'in_app',
    template: 'status_changed', recipient: 'in_app', subject, body, status: 'sent',
  }).select().single();
  if (error) throw error;
  return data;
}

export async function listUserNotifications(userId, { limit = 30 } = {}) {
  const { data, error } = await supabaseAdmin.from('notifications')
    .select('id, donation_id, subject, body, sent_at, read_at')
    .eq('user_id', userId).eq('channel', 'in_app')
    .order('sent_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function countUnreadNotifications(userId) {
  const { count, error } = await supabaseAdmin.from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('channel', 'in_app').is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

// Mark the user's in-app notifications read. Pass specific ids, or omit to mark
// all currently-unread ones read.
export async function markNotificationsRead(userId, ids) {
  let q = supabaseAdmin.from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId).eq('channel', 'in_app').is('read_at', null);
  if (Array.isArray(ids) && ids.length) q = q.in('id', ids);
  const { error } = await q;
  if (error) throw error;
}

// ---------- stats (public dashboard) ----------

export async function getPublicStats() {
  const [items, benCount, volCount, donorCount] = await Promise.all([
    // Only items belonging to a delivered donation count.
    supabaseAdmin.from('v_delivered_items').select('quantity'),
    supabaseAdmin.from('schools').select('id', { count: 'exact', head: true }).eq('type', 'beneficiary').eq('status', 'approved'),
    supabaseAdmin.from('schools').select('id', { count: 'exact', head: true }).eq('type', 'volunteer').eq('status', 'approved'),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'donor'),
  ]);

  const booksDelivered = (items.data || []).reduce((sum, row) => sum + (row.quantity || 0), 0);

  return {
    books_delivered: booksDelivered,
    beneficiary_schools: benCount.count ?? 0,
    volunteer_schools: volCount.count ?? 0,
    donors: donorCount.count ?? 0,
  };
}

// ---------- search ----------

// Build a PostgREST `or(...)` value that is safe even when the user query
// contains the reserved characters the `or` grammar uses (commas, parentheses,
// dots). The ilike pattern is wrapped in double quotes so PostgREST treats the
// whole value as a literal; LIKE wildcards (% _) and the escape char (\) are
// neutralised, and any embedded double-quote/backslash is stripped so it can't
// terminate the quoted value or escape out of it.
export async function search({ q, type }) {
  const results = { schools: [], books: [] };

  if (type === 'all' || type === 'beneficiary' || type === 'volunteer') {
    let query = supabaseAdmin
      .from('schools')
      .select('id, name, type, region, city, photo_url')
      .eq('status', 'approved')
      .or(buildIlikeOr(['name', 'region', 'city'], q));
    if (type === 'beneficiary' || type === 'volunteer') query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    results.schools = data || [];
  }

  if (type === 'all' || type === 'book') {
    const { data, error } = await supabaseAdmin
      .from('book_requests')
      .select('id, title, author, genre, school_id, schools(name, region)')
      .or(buildIlikeOr(['title', 'author', 'genre'], q));
    if (error) throw error;
    results.books = data || [];
  }

  return results;
}

// ---------- admin donations / cancel / contact lookup ----------

export async function listAllDonations({ status, school_id, limit = 100, offset = 0 } = {}) {
  let q = supabaseAdmin
    .from('donations')
    .select('*, donation_items(*), beneficiary_school:beneficiary_school_id(name,region), volunteer_school:volunteer_school_id(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) q = q.eq('status', status);
  if (school_id) q = q.or(`beneficiary_school_id.eq.${school_id},volunteer_school_id.eq.${school_id}`);
  const { data, error, count } = await q;
  if (error) throw error;
  return { items: data || [], total: count ?? 0 };
}

export async function cancelDonation(donationId, byUserId, note) {
  const { data: current, error: e1 } = await supabaseAdmin
    .from('donations').select('status, donor_user_id').eq('id', donationId).single();
  if (e1) throw e1;
  if (current.status === 'delivered' || current.status === 'cancelled') {
    const err = new Error('cannot_cancel_in_status_' + current.status);
    err.status = 409;
    throw err;
  }
  const { data, error } = await supabaseAdmin
    .from('donations').update({ status: 'cancelled' }).eq('id', donationId).select().single();
  if (error) throw error;
  await supabaseAdmin.from('donation_status_history').insert({
    donation_id: donationId,
    from_status: current.status,
    to_status: 'cancelled',
    changed_by: byUserId,
    note: note || 'cancelled by user',
  });
  return data;
}

export async function listDonationsForVolunteer(volunteerSchoolId) {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .select('*, donation_items(*), beneficiary_school:beneficiary_school_id(name,region,city)')
    .eq('volunteer_school_id', volunteerSchoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Donations addressed to a beneficiary (receiving) school, CONFIRMED ONLY —
// i.e. the books are actually committed and in the pipeline (at a hub, in
// transit, or delivered). Pending (not yet confirmed by a hub) and cancelled
// donations are intentionally hidden from the school.
const BENEFICIARY_VISIBLE_STATUSES = ['at_volunteer', 'in_transit', 'delivered'];

export async function listDonationsForBeneficiary(beneficiarySchoolId) {
  // Explicit projection — never expose donor PII (donor_user_id, donor_address)
  // to the receiving school. Only fields the school legitimately needs.
  const { data, error } = await supabaseAdmin
    .from('donations')
    .select('id, status, created_at, delivery_method, courier_provider, courier_tracking_id, track_token, notes, donation_items(*), volunteer_school:volunteer_school_id(name,region,city)')
    .eq('beneficiary_school_id', beneficiarySchoolId)
    .in('status', BENEFICIARY_VISIBLE_STATUSES)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDonorContact(donationId) {
  // donor email — used for email notifications when admin updates status.
  const { data, error } = await supabaseAdmin
    .from('donations').select('donor_user_id').eq('id', donationId).maybeSingle();
  if (error) throw error;
  if (!data?.donor_user_id) return null;

  const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.donor_user_id);
  const { data: p } = await supabaseAdmin
    .from('profiles').select('language, full_name').eq('id', data.donor_user_id).maybeSingle();

  return {
    user_id: data.donor_user_id,
    email: u?.user?.email || null,
    language: p?.language || 'en',
    full_name: p?.full_name || '',
  };
}

export async function nearestVolunteerSchools(lat, lng, limit = 5) {
  const { data, error } = await supabaseAdmin.rpc('nearest_volunteer_schools', {
    in_lat: lat, in_lng: lng, in_limit: limit,
  });
  if (error) throw error;
  return data;
}

// ---------- schools owned by user ----------

export async function listSchoolsByOwner(ownerUserId) {
  const { data, error } = await supabaseAdmin
    .from('schools').select('*').eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// All schools regardless of status — admin-only, used by the ownership-transfer
// picker (the imported schools to reassign may be approved or pending).
export async function listAllSchools() {
  const { data, error } = await supabaseAdmin
    .from('schools').select('id, name, type, status, region').order('name');
  if (error) throw error;
  return data || [];
}

// Hand a school over to its real owner (admin tool). The imported schools are
// all owned by one admin account; this lets an admin assign a school to the
// account of the person who actually runs it.
export async function transferSchoolOwnership(schoolId, newOwnerUserId) {
  return updateSchool(schoolId, { owner_user_id: newOwnerUserId });
}

// Look up an auth user by email (case-insensitive). GoTrue's admin listUsers is
// paginated and has no email filter, so we scan a bounded number of pages —
// fine at BookBridge's user scale.
export async function findUserByEmail(email) {
  const target = String(email).trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find((u) => (u.email || '').toLowerCase() === target);
    if (found) return found;
    if (users.length < 200) break;
  }
  return null;
}

// Email + language to notify a school (on approval/rejection). Prefer the
// school's public contact_email; fall back to the owner account's email.
export async function getSchoolOwnerContact(school) {
  if (!school) return null;
  let language = 'en';
  if (school.owner_user_id) {
    const { data: p } = await supabaseAdmin
      .from('profiles').select('language').eq('id', school.owner_user_id).maybeSingle();
    language = p?.language || 'en';
  }
  if (school.contact_email) return { email: school.contact_email, language };
  if (!school.owner_user_id) return null;
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(school.owner_user_id);
  return { email: u?.user?.email || null, language };
}

// Email addresses of all admins — used to alert them when a new school is
// submitted for approval.
export async function getAdminEmails() {
  const { data: admins, error } = await supabaseAdmin
    .from('profiles').select('id').eq('role', 'admin');
  if (error) throw error;
  const emails = [];
  for (const a of admins || []) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(a.id);
    if (u?.user?.email) emails.push(u.user.email);
  }
  return emails;
}

// ---------- site_content (admin CMS) ----------

export async function listSiteContent() {
  const { data, error } = await supabaseAdmin.from('site_content').select('*').order('key');
  if (error) throw error;
  return data || [];
}

export async function upsertSiteContent(key, valueEn, valueKa, byUserId) {
  const { data, error } = await supabaseAdmin
    .from('site_content')
    .upsert({ key, value_en: valueEn, value_ka: valueKa, updated_by: byUserId, updated_at: new Date().toISOString() })
    .select().single();
  if (error) throw error;
  return data;
}

// ---------- leaderboard ----------

export async function getLeaderboard(limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('v_donor_leaderboard')
    .select('user_id, username, total_books, donation_count')
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ---------- activity feed ----------

export async function getActivityFeed(limit = 12) {
  const { data, error } = await supabaseAdmin
    .from('v_activity_feed')
    .select('*')
    .limit(limit);
  if (error) throw error;
  return data || [];
}
