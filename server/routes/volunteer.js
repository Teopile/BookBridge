import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import {
  listSchoolsByOwner, getSchoolById, listDonationsForVolunteer,
  updateDonationStatus, getDonation, canTransition,
} from '../db/store.js';
import { notifyDonorOfStatus } from '../lib/notify.js';

const router = Router();

router.get('/my-schools', requireAuth, async (req, res, next) => {
  try {
    const schools = await listSchoolsByOwner(req.user.id);
    res.json(schools.filter((s) => s.type === 'volunteer'));
  } catch (err) { next(err); }
});

router.get('/incoming/:schoolId', requireAuth, async (req, res, next) => {
  try {
    const school = await getSchoolById(req.params.schoolId);
    if (!school) return res.status(404).json({ error: 'not_found' });
    if (school.type !== 'volunteer') return res.status(400).json({ error: 'not_a_volunteer_school' });
    if (school.owner_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    const donations = await listDonationsForVolunteer(req.params.schoolId);
    res.json(donations);
  } catch (err) { next(err); }
});

// A hub may store (at_volunteer), ship (in_transit), hand-deliver (delivered),
// or cancel. The full lifecycle is enforced by canTransition below.
const VolStatusSchema = z.object({
  status: z.enum(['at_volunteer', 'in_transit', 'delivered', 'cancelled']),
  note: z.string().max(500).optional(),
  courier_tracking_id: z.string().max(120).optional(),
});

router.post('/donations/:id/status', csrfProtection, requireAuth, validate(VolStatusSchema), async (req, res, next) => {
  try {
    const d = await getDonation(req.params.id);
    if (!d) return res.status(404).json({ error: 'not_found' });
    const isAdmin = req.user.role === 'admin';
    let allowed = isAdmin;
    if (!allowed && d.volunteer_school_id) {
      const sch = await getSchoolById(d.volunteer_school_id);
      allowed = sch?.owner_user_id === req.user.id;
    }
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    // Non-admins are held to the lifecycle order (no skipping/rewinding).
    if (!isAdmin && !canTransition(d.status, req.body.status)) {
      return res.status(409).json({ error: 'invalid_transition', from: d.status, to: req.body.status });
    }

    const updated = await updateDonationStatus(
      req.params.id, req.body.status, req.user.id, req.body.note, req.body.courier_tracking_id,
    );

    try { await notifyDonorOfStatus(updated); }
    catch (e) { console.error('[volunteer] notify failed:', e.message); }

    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
