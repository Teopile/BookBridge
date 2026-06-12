import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import {
  listApprovedSchools, getSchoolById, createSchool, updateSchool, listPendingSchools,
  listBookRequests, createBookRequest, deleteBookRequest, listSchoolsByOwner,
  listDonationsForBeneficiary, transferSchoolOwnership, findUserByEmail,
  getSchoolOwnerContact, getAdminEmails, listAllSchools, toPublicSchool,
} from '../db/store.js';
import { SchoolCreateSchema, SchoolApproveSchema, BookRequestSchema } from '../schemas.js';
import { sendEmail, Templates } from '../lib/mailer.js';
import { frontendOrigin } from '../lib/origins.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { type, region } = req.query;
    res.json(await listApprovedSchools({ type, region }));
  } catch (err) { next(err); }
});

// All schools owned by the current user — both beneficiary and volunteer types,
// regardless of approval status. Used by /school/manage.
// Must come BEFORE /:id so the literal path wins over the param route.
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    res.json(await listSchoolsByOwner(req.user.id));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const school = await getSchoolById(req.params.id);
    if (!school || school.status !== 'approved') return res.status(404).json({ error: 'not_found' });
    const requests = await listBookRequests(school.id);
    // Public endpoint — strip contact/operational fields before responding.
    res.json({ ...toPublicSchool(school), book_requests: requests });
  } catch (err) { next(err); }
});

router.get('/:id/book-requests', async (req, res, next) => {
  try { res.json(await listBookRequests(req.params.id)); } catch (err) { next(err); }
});

// Donations addressed to this (beneficiary) school — owner or admin only.
// Confirmed-only: at a hub / in transit / delivered. Pending & cancelled hidden.
router.get('/:id/donations', requireAuth, async (req, res, next) => {
  try {
    const school = await getSchoolById(req.params.id);
    if (!school) return res.status(404).json({ error: 'not_found' });
    if (school.owner_user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'forbidden' });
    res.json(await listDonationsForBeneficiary(req.params.id));
  } catch (err) { next(err); }
});

router.post('/', csrfProtection, requireAuth, validate(SchoolCreateSchema), async (req, res, next) => {
  try {
    const created = await createSchool(req.user.id, req.body);

    // Best-effort: alert admins that a new school is awaiting approval.
    try {
      const admins = await getAdminEmails();
      if (admins.length) {
        const tpl = Templates.schoolSubmitted({
          schoolName: created.name, schoolType: created.type,
          reviewUrl: process.env.PUBLIC_ADMIN_ORIGIN || frontendOrigin(),
        });
        for (const to of admins) {
          await sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
        }
      }
    } catch (e) {
      console.error('[schools] new-submission admin alert failed:', e.message);
    }

    res.status(201).json(created);
  } catch (err) { next(err); }
});

const SchoolPatchSchema = SchoolCreateSchema.partial();
router.put('/:id', csrfProtection, requireAuth, validate(SchoolPatchSchema), async (req, res, next) => {
  try {
    const existing = await getSchoolById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not_found' });
    if (existing.owner_user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'forbidden' });
    res.json(await updateSchool(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.post('/:id/book-requests', csrfProtection, requireAuth, validate(BookRequestSchema.omit({ school_id: true })), async (req, res, next) => {
  try {
    const school = await getSchoolById(req.params.id);
    if (!school) return res.status(404).json({ error: 'not_found' });
    if (school.owner_user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'forbidden' });
    const created = await createBookRequest({ ...req.body, school_id: req.params.id });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.delete('/:id/book-requests/:reqId', csrfProtection, requireAuth, async (req, res, next) => {
  try {
    const school = await getSchoolById(req.params.id);
    if (!school) return res.status(404).json({ error: 'not_found' });
    if (school.owner_user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'forbidden' });
    await deleteBookRequest(req.params.reqId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export const adminRouter = Router();

adminRouter.get('/pending', requireAuth, requireAdmin, async (_req, res, next) => {
  try { res.json(await listPendingSchools()); } catch (err) { next(err); }
});

// All schools (any status) — for the admin ownership-transfer picker.
adminRouter.get('/all', requireAuth, requireAdmin, async (_req, res, next) => {
  try { res.json(await listAllSchools()); } catch (err) { next(err); }
});

adminRouter.post('/:id/approval', csrfProtection, requireAuth, requireAdmin, validate(SchoolApproveSchema), async (req, res, next) => {
  try {
    const updated = await updateSchool(req.params.id, {
      status: req.body.status, approval_note: req.body.approval_note,
    });

    // Best-effort: tell the school it was approved or rejected.
    try {
      const contact = await getSchoolOwnerContact(updated);
      if (contact?.email) {
        const manageUrl = `${frontendOrigin()}/en/${updated.type === 'volunteer' ? 'volunteer' : 'school'}/manage`;
        const tpl = updated.status === 'approved'
          ? Templates.schoolApproved({ schoolName: updated.name, manageUrl, publicUrl: `${frontendOrigin()}/en/schools/${updated.id}`, lang: contact.language })
          : Templates.schoolRejected({ schoolName: updated.name, note: updated.approval_note || '', lang: contact.language });
        await sendEmail({ to: contact.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      }
    } catch (e) {
      console.error('[schools] approval email failed:', e.message);
    }

    res.json(updated);
  } catch (err) { next(err); }
});

// Hand a school over to the account of the person who actually runs it.
// Lets an admin assign one of the bulk-imported (admin-owned) schools to a
// real school user by their email.
const SchoolTransferSchema = z.object({ owner_email: z.string().email() });
adminRouter.post('/:id/transfer', csrfProtection, requireAuth, requireAdmin, validate(SchoolTransferSchema), async (req, res, next) => {
  try {
    const school = await getSchoolById(req.params.id);
    if (!school) return res.status(404).json({ error: 'not_found' });
    const user = await findUserByEmail(req.body.owner_email);
    if (!user) return res.status(404).json({ error: 'user_not_found' });
    const updated = await transferSchoolOwnership(req.params.id, user.id);
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
