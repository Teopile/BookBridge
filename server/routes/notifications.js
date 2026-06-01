import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import {
  listUserNotifications, countUnreadNotifications, markNotificationsRead,
} from '../db/store.js';

const router = Router();

// The signed-in user's in-app notifications + unread count.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [items, unread] = await Promise.all([
      listUserNotifications(req.user.id),
      countUnreadNotifications(req.user.id),
    ]);
    res.json({ items, unread });
  } catch (err) { next(err); }
});

// Mark notifications read. Pass { ids: [...] } to mark specific ones, or omit to
// mark all currently-unread read.
const ReadSchema = z.object({ ids: z.array(z.string().uuid()).max(200).optional() });
router.post('/read', csrfProtection, requireAuth, validate(ReadSchema), async (req, res, next) => {
  try {
    await markNotificationsRead(req.user.id, req.body.ids);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
