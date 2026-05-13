import { Router } from 'express';
import crypto from 'node:crypto';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import { MonetaryDonationSchema } from '../schemas.js';
import { createMonetaryDonation, updateMonetaryDonationStatus, recordNotification } from '../db/store.js';
import { sendEmail, Templates } from '../lib/mailer.js';

const router = Router();

// Verifies a Flitt webhook signature: HMAC-SHA256 of the raw body with FLITT_WEBHOOK_SECRET.
// Flitt may send the signature as the `x-flitt-signature` header. Adapt to your provider's spec.
function verifyFlittSignature(rawBody, signatureHeader) {
  const secret = process.env.FLITT_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signatureHeader) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(String(signatureHeader).trim(), 'hex'),
    );
  } catch {
    return false;
  }
}

router.post('/monetary', csrfProtection, validate(MonetaryDonationSchema), async (req, res, next) => {
  try {
    const donorUserId = req.user?.id || null;
    const created = await createMonetaryDonation(donorUserId, req.body);

    const provider = (process.env.PAYMENT_PROVIDER || 'disabled').toLowerCase();
    if (provider === 'disabled') {
      await updateMonetaryDonationStatus(created.id, 'succeeded', 'dev-' + created.id);
      return res.json({ donation_id: created.id, status: 'succeeded', payment_url: null });
    }

    if (provider === 'flitt') {
      const paymentUrl = `https://pay.flitt.com/api/checkout/redirect?order_id=${created.id}`;
      return res.json({ donation_id: created.id, status: 'pending', payment_url: paymentUrl });
    }

    res.status(501).json({ error: `payment_provider_${provider}_not_implemented` });
  } catch (err) { next(err); }
});

router.post('/flitt/webhook', async (req, res, next) => {
  try {
    // Reject in production if no signature secret is configured.
    if (process.env.NODE_ENV === 'production' && !process.env.FLITT_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'webhook_secret_not_configured' });
    }
    if (process.env.FLITT_WEBHOOK_SECRET) {
      const sig = req.get('x-flitt-signature');
      const raw = req.rawBody || JSON.stringify(req.body || {});
      if (!verifyFlittSignature(raw, sig)) {
        return res.status(401).json({ error: 'invalid_signature' });
      }
    }

    const { order_id, payment_id, status } = req.body || {};
    if (!order_id) return res.status(400).json({ error: 'missing_order_id' });

    const mapped = status === 'approved' ? 'succeeded'
                 : status === 'declined' ? 'failed' : 'pending';

    const updated = await updateMonetaryDonationStatus(order_id, mapped, payment_id);

    if (mapped === 'succeeded' && updated.donor_email_for_receipt) {
      const tpl = Templates.monetaryReceipt({
        amountMinor: updated.amount_minor, currency: updated.currency, lang: 'en',
      });
      try {
        await sendEmail({ to: updated.donor_email_for_receipt, subject: tpl.subject, html: tpl.html, text: tpl.text });
        await recordNotification({
          user_id: updated.donor_user_id, channel: 'email', template: 'monetary_receipt',
          recipient: updated.donor_email_for_receipt, subject: tpl.subject, status: 'sent',
        });
      } catch (e) {
        console.error('[payments/webhook] receipt email failed:', e.message);
      }
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/monetary/me', requireAuth, async (_req, res) => {
  res.json([]);
});

export default router;
