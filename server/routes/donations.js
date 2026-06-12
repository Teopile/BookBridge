import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import {
  createDonation, setDonationCourier, getDonation, getDonationByTrackToken,
  listDonationsForUser, updateDonationStatus, getSchoolById, recordNotification,
  listAllDonations, cancelDonation, canTransition,
} from '../db/store.js';
import { DonationCreateSchema, DonationStatusUpdateSchema, AdminDonationsListSchema } from '../schemas.js';
import { createShipment } from '../lib/courier.js';
import { sendEmail, Templates } from '../lib/mailer.js';
import { notifyDonorOfStatus } from '../lib/notify.js';
import { trackUrl as makeTrackUrl } from '../lib/origins.js';
const router = Router();

router.post('/', csrfProtection, requireAuth, validate(DonationCreateSchema), async (req, res, next) => {
  try {
    const payload = { ...req.body };

    // Persist the donation FIRST so a failing courier provider can never lose it.
    let created = await createDonation(req.user.id, payload);

    // Best-effort courier booking. On failure we keep the donation (tracking id
    // stays null) and log the error rather than rejecting the request.
    if (payload.delivery_method === 'courier') {
      try {
        const ship = await createShipment({
          origin: payload.volunteer_school_id,
          destination: payload.beneficiary_school_id,
          items: payload.items,
          donorContact: { user_id: req.user.id, address: payload.donor_address },
        });
        created = await setDonationCourier(created.id, ship.provider, ship.tracking_id);
      } catch (e) {
        console.error('[donations] courier shipment booking failed:', e.message);
      }
    }

    const url = makeTrackUrl(created.track_token, req.user.language);
    const tpl = Templates.donationConfirmed({ donationId: created.id, trackUrl: url, lang: req.user.language });
    try {
      await sendEmail({ to: req.user.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      await recordNotification({
        user_id: req.user.id, donation_id: created.id, channel: 'email',
        template: 'donation_confirmed', recipient: req.user.email, subject: tpl.subject, status: 'sent',
      });
    } catch (e) {
      console.error('[donations] confirmation email failed:', e.message);
    }

    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try { res.json(await listDonationsForUser(req.user.id)); } catch (err) { next(err); }
});

router.get('/track/:token', async (req, res, next) => {
  try {
    const d = await getDonationByTrackToken(req.params.token);
    if (!d) return res.status(404).json({ error: 'not_found' });
    const { donor_user_id, donor_address, ...rest } = d;
    res.json(rest);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const d = await getDonation(req.params.id);
    if (!d) return res.status(404).json({ error: 'not_found' });
    const isOwner = d.donor_user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'forbidden' });
    res.json(d);
  } catch (err) { next(err); }
});

// Donor cancels their own donation (allowed only while not delivered/cancelled).
router.post('/:id/cancel', csrfProtection, requireAuth, async (req, res, next) => {
  try {
    const d = await getDonation(req.params.id);
    if (!d) return res.status(404).json({ error: 'not_found' });
    if (d.donor_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    const updated = await cancelDonation(req.params.id, req.user.id, req.body?.note);
    res.json(updated);
  } catch (err) { next(err); }
});

// Receiving (beneficiary) school confirms it physically received the books.
// Allowed for the owner of the donation's beneficiary school (or admin), and
// only as a valid transition (at_volunteer / in_transit -> delivered).
router.post('/:id/confirm-receipt', csrfProtection, requireAuth, async (req, res, next) => {
  try {
    const d = await getDonation(req.params.id);
    if (!d) return res.status(404).json({ error: 'not_found' });
    const isAdmin = req.user.role === 'admin';
    let allowed = isAdmin;
    if (!allowed && d.beneficiary_school_id) {
      const sch = await getSchoolById(d.beneficiary_school_id);
      allowed = sch?.owner_user_id === req.user.id;
    }
    if (!allowed) return res.status(403).json({ error: 'forbidden' });
    if (!isAdmin && !canTransition(d.status, 'delivered')) {
      return res.status(409).json({ error: 'invalid_transition', from: d.status, to: 'delivered' });
    }
    const updated = await updateDonationStatus(
      req.params.id, 'delivered', req.user.id, req.body?.note || 'received by school',
    );
    try { await notifyDonorOfStatus(updated); }
    catch (e) { console.error('[donations] confirm-receipt notify failed:', e.message); }
    res.json(updated);
  } catch (err) { next(err); }
});

// ---------- Admin ----------
export const adminRouter = Router();

adminRouter.get('/', requireAuth, requireAdmin, validate(AdminDonationsListSchema, 'query'), async (req, res, next) => {
  try {
    const result = await listAllDonations(req.query);
    res.json(result);
  } catch (err) { next(err); }
});

adminRouter.get('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const d = await getDonation(req.params.id);
    if (!d) return res.status(404).json({ error: 'not_found' });
    res.json(d);
  } catch (err) { next(err); }
});

adminRouter.post('/:id/status', csrfProtection, requireAuth, requireAdmin, validate(DonationStatusUpdateSchema), async (req, res, next) => {
  try {
    const updated = await updateDonationStatus(
      req.params.id, req.body.status, req.user.id, req.body.note, req.body.courier_tracking_id,
    );

    // Fan out email + in-app notification. Best-effort, don't fail the request.
    try {
      await notifyDonorOfStatus(updated);
    } catch (e) {
      console.error('[donations] notification dispatch failed:', e.message);
    }

    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
