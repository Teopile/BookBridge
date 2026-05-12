import { Router } from 'express';
import crypto from 'node:crypto';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import { SignedUploadSchema } from '../schemas.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

router.post('/sign-upload', csrfProtection, requireAuth, validate(SignedUploadSchema), async (req, res, next) => {
  try {
    const { bucket, filename } = req.body;
    const safe = filename.replace(/[^a-zA-Z0-9._\-\/]/g, '_');
    const ext = safe.includes('.') ? safe.split('.').pop().slice(0, 8) : 'bin';
    const path = `${req.user.id}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
    if (error) return res.status(400).json({ error: error.message });

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    res.json({
      bucket, path,
      signed_url: data.signedUrl,
      token: data.token,
      public_url: pub.publicUrl,
    });
  } catch (err) { next(err); }
});

export default router;
