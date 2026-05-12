import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import {
  listApprovedSchools, getSchoolById, createSchool, updateSchool, listPendingSchools,
  listBookRequests, createBookRequest, deleteBookRequest,
} from '../db/store.js';
import { SchoolCreateSchema, SchoolApproveSchema, BookRequestSchema } from '../schemas.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { type, region } = req.query;
    res.json(await listApprovedSchools({ type, region }));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const school = await getSchoolById(req.params.id);
    if (!school || school.status !== 'approved') return res.status(404).json({ error: 'not_found' });
    const requests = await listBookRequests(school.id);
    res.json({ ...school, book_requests: requests });
  } catch (err) { next(err); }
});

router.get('/:id/book-requests', async (req, res, next) => {
  try { res.json(await listBookRequests(req.params.id)); } catch (err) { next(err); }
});

router.post('/', csrfProtection, requireAuth, validate(SchoolCreateSchema), async (req, res, next) => {
  try {
    const created = await createSchool(req.user.id, req.body);
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

adminRouter.post('/:id/approval', csrfProtection, requireAuth, requireAdmin, validate(SchoolApproveSchema), async (req, res, next) => {
  try {
    res.json(await updateSchool(req.params.id, {
      status: req.body.status, approval_note: req.body.approval_note,
    }));
  } catch (err) { next(err); }
});

export default router;
