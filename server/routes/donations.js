import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import {
  createDonation, setDonationCourier, getDonation, getDonationByTrackToken,
  listDonationsForUser, updateDonationStatus, getSchoolById, recordNotification,
  listAllDonations, cancelDonation, getDonorContact,
} from '../db/store.js';
import { DonationCreateSchema, DonationStatusUpdateSchema, AdminDonationsListSchema } from '../schemas.js';
import { createShipment } from '../lib/courier.js';
import { sendEmail, Templates } from '../lib/mailer.js';
const router = Router();

function trackUrlFor(token) {
  const origin = process.env.PUBLIC_FRONTEND_ORIGIN || 'http://localhost:5173';
  return `${origin}/en/track/${token}`;
}

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

    const url = trackUrlFor(created.track_token);
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

    // Fire notifications based on what changed. Best-effort, don't fail the request.
    try {
      await fireStatusNotifications(updated);
    } catch (e) {
      console.error('[donations] notification dispatch failed:', e.message);
    }

    res.json(updated);
  } catch (err) { next(err); }
});

// ---------- Notification fan-out ----------
async function fireStatusNotifications(donation) {
  const contact = await getDonorContact(donation.id);
  if (!contact) return;
  const url = trackUrlFor(donation.track_token);
  const lang = contact.language || 'en';
  const school = donation.beneficiary_school_id ? await getSchoolById(donation.beneficiary_school_id) : null;

  let tpl;
  if (donation.status === 'delivered') {
    tpl = Templates.donationDelivered({ donationId: donation.id, schoolName: school?.name || '', trackUrl: url, lang });
  } else {
    tpl = Templates.statusChanged({ donationId: donation.id, status: donation.status, trackUrl: url, lang });
  }

  // Email.
  if (contact.email) {
    try {
      await sendEmail({ to: contact.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      await recordNotification({
        user_id: contact.user_id, donation_id: donation.id, channel: 'email',
        template: donation.status === 'delivered' ? 'donation_delivered' : 'status_changed',
        recipient: contact.email, subject: tpl.subject, status: 'sent',
      });
    } catch (e) {
      await recordNotification({
        user_id: contact.user_id, donation_id: donation.id, channel: 'email',
        template: 'status_changed', recipient: contact.email,
        subject: tpl.subject, status: 'failed', error_message: e.message,
      });
    }
  }

}

export default router;
