// All Supabase queries live here. Routes call these helpers; they don't touch supabaseAdmin directly.

import { supabaseAdmin } from '../lib/supabase.js';

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

  return data;
}

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
function buildIlikeOr(columns, raw) {
  const sanitized = String(raw).replace(/["\\]/g, '');
  const escapedForLike = sanitized.replace(/[%_]/g, '\\$&');
  const pattern = `%${escapedForLike}%`;
  return columns.map((col) => `${col}.ilike."${pattern}"`).join(',');
}

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
