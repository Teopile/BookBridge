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
