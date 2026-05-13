import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { listSiteContent, upsertSiteContent, nearestVolunteerSchools } from '../db/store.js';
import { SiteContentUpsertSchema, NearestVolunteerSchema } from '../schemas.js';
import { sendEmail } from '../lib/mailer.js';

const router = Router();

router.get('/content', requireAuth, requireAdmin, async (_req, res, next) => {
  try { res.json(await listSiteContent()); } catch (err) { next(err); }
});

// Aggregated dashboard data — single round-trip for the admin Home page.
router.get('/stats', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const head = { count: 'exact', head: true };

    const [
      benApproved, benPending, volApproved, volPending,
      allDonations,
      pendingD, atVolunteerD, inTransitD, deliveredD, cancelledD,
      deliveredItems,
      allBookRequests,
      donorCount, allUsersCount,
      regions, recentUsersList,
      activity, leaderboard,
    ] = await Promise.all([
      supabaseAdmin.from('schools').select('id', head).eq('type', 'beneficiary').eq('status', 'approved'),
      supabaseAdmin.from('schools').select('id', head).eq('type', 'beneficiary').eq('status', 'pending'),
      supabaseAdmin.from('schools').select('id', head).eq('type', 'volunteer').eq('status', 'approved'),
      supabaseAdmin.from('schools').select('id', head).eq('type', 'volunteer').eq('status', 'pending'),
      supabaseAdmin.from('donations').select('id', head),
      supabaseAdmin.from('donations').select('id', head).eq('status', 'pending'),
      supabaseAdmin.from('donations').select('id', head).eq('status', 'at_volunteer'),
      supabaseAdmin.from('donations').select('id', head).eq('status', 'in_transit'),
      supabaseAdmin.from('donations').select('id', head).eq('status', 'delivered'),
      supabaseAdmin.from('donations').select('id', head).eq('status', 'cancelled'),
      supabaseAdmin.from('v_delivered_items').select('quantity'),
      supabaseAdmin.from('book_requests').select('id', head),
      supabaseAdmin.from('profiles').select('id', head).eq('role', 'donor'),
      supabaseAdmin.from('profiles').select('id', head),
      supabaseAdmin.from('schools').select('region').eq('status', 'approved'),
      supabaseAdmin.from('profiles').select('id, username, role, created_at').order('created_at', { ascending: false }).limit(8),
      supabaseAdmin.from('v_activity_feed').select('*').limit(10),
      supabaseAdmin.from('v_donor_leaderboard').select('user_id, username, total_books, donation_count').limit(5),
    ]);

    const booksDelivered = (deliveredItems.data || []).reduce((s, r) => s + (r.quantity || 0), 0);

    const regionMap = new Map();
    for (const row of regions.data || []) {
      const key = (row.region || '—').trim();
      regionMap.set(key, (regionMap.get(key) || 0) + 1);
    }
    const schoolsByRegion = [...regionMap.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      totals: {
        books_delivered:        booksDelivered,
        beneficiary_schools:    benApproved.count ?? 0,
        volunteer_schools:      volApproved.count ?? 0,
        schools_pending:        (benPending.count ?? 0) + (volPending.count ?? 0),
        donors:                 donorCount.count ?? 0,
        all_users:              allUsersCount.count ?? 0,
        all_donations:          allDonations.count ?? 0,
        active_donations:       (pendingD.count ?? 0) + (atVolunteerD.count ?? 0) + (inTransitD.count ?? 0),
        delivered_donations:    deliveredD.count ?? 0,
        all_book_requests:      allBookRequests.count ?? 0,
      },
      donations_by_status: [
        { status: 'pending',      count: pendingD.count      ?? 0 },
        { status: 'at_volunteer', count: atVolunteerD.count  ?? 0 },
        { status: 'in_transit',   count: inTransitD.count    ?? 0 },
        { status: 'delivered',    count: deliveredD.count    ?? 0 },
        { status: 'cancelled',    count: cancelledD.count    ?? 0 },
      ],
      schools_by_region: schoolsByRegion,
      recent_users:      recentUsersList.data || [],
      recent_activity:   activity.data || [],
      top_donors:        leaderboard.data || [],
    });
  } catch (err) { next(err); }
});

router.put('/content', csrfProtection, requireAuth, requireAdmin, validate(SiteContentUpsertSchema), async (req, res, next) => {
  try {
    const row = await upsertSiteContent(req.body.key, req.body.value_en ?? null, req.body.value_ka ?? null, req.user.id);
    res.json(row);
  } catch (err) { next(err); }
});

router.get('/nearest-volunteer', validate(NearestVolunteerSchema, 'query'), async (req, res, next) => {
  try {
    const data = await nearestVolunteerSchools(req.query.lat, req.query.lng, req.query.limit);
    res.json(data);
  } catch (err) { next(err); }
});

const CsvExportSchema = z.object({
  resource: z.enum(['donations', 'monetary_donations', 'schools']),
  status: z.string().max(40).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

router.get('/export.csv', requireAuth, requireAdmin, validate(CsvExportSchema, 'query'), async (req, res, next) => {
  try {
    const rows = await fetchExportRows(req.query);
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${req.query.resource}-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
});

async function fetchExportRows({ resource, status, from, to }) {
  if (resource === 'donations') {
    let q = supabaseAdmin
      .from('donations')
      .select('id, donor_user_id, beneficiary_school_id, volunteer_school_id, delivery_method, status, courier_provider, courier_tracking_id, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);
    const { data } = await q;
    return data || [];
  }
  if (resource === 'monetary_donations') {
    let q = supabaseAdmin
      .from('monetary_donations')
      .select('id, donor_user_id, amount_minor, currency, status, provider, provider_payment_id, donor_email_for_receipt, created_at')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);
    const { data } = await q;
    return data || [];
  }
  if (resource === 'schools') {
    let q = supabaseAdmin
      .from('schools')
      .select('id, name, type, status, region, city, address, contact_email, created_at')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data } = await q;
    return data || [];
  }
  return [];
}

function csvEscape(v) {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : (v instanceof Date ? v.toISOString() : JSON.stringify(v));
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

const ManualNotifySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(50_000),
});
router.post('/notify', csrfProtection, requireAuth, requireAdmin, validate(ManualNotifySchema), async (req, res, next) => {
  try {
    await sendEmail({ to: req.body.to, subject: req.body.subject, html: req.body.html });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

const RoleChangeSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['donor', 'beneficiary', 'volunteer', 'admin']),
});
router.post('/users/role', csrfProtection, requireAuth, requireAdmin, validate(RoleChangeSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles').update({ role: req.body.role }).eq('id', req.body.user_id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
