import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth, SESSION_COOKIE_NAME } from '../middleware/auth.js';
import {
  RegisterSchema, LoginSchema,
  ForgotPasswordSchema, ResetPasswordSchema, ConfirmEmailSchema,
  MfaEnrollSchema, MfaVerifySchema, MfaChallengeSchema,
} from '../schemas.js';
import { supabaseAuth, supabaseAdmin } from '../lib/supabase.js';
import { sendEmail, Templates } from '../lib/mailer.js';
import { recordNotification } from '../db/store.js';

const router = Router();

// Strict per-route limiter for auth-sensitive endpoints — defends against credential stuffing.
const authStrictLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

const cookieOpts = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30 * 1000,
});

router.post('/register', csrfProtection, validate(RegisterSchema), async (req, res, next) => {
  try {
    const { email, password, full_name, role, language } = req.body;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name, role, language },
    });
    if (error) return res.status(400).json({ error: error.message });

    const tpl = Templates.registration({ fullName: full_name, lang: language });
    try {
      await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
      await recordNotification({
        user_id: data.user?.id, channel: 'email', template: 'registration',
        recipient: email, subject: tpl.subject, status: 'sent',
      });
    } catch (e) {
      console.error('[auth/register] welcome email failed:', e.message);
    }

    res.status(201).json({ user_id: data.user?.id, needs_confirmation: true });
  } catch (err) { next(err); }
});

router.post('/login', authStrictLimiter, csrfProtection, validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.cookie(SESSION_COOKIE_NAME, data.session.access_token, cookieOpts());
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: { id: data.user.id, email: data.user.email },
    });
  } catch (err) { next(err); }
});

router.post('/logout', csrfProtection, (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

const RefreshSchema = z.object({ refresh_token: z.string().min(8) });
router.post('/refresh', csrfProtection, validate(RefreshSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: req.body.refresh_token });
    if (error) return res.status(401).json({ error: error.message });
    res.cookie(SESSION_COOKIE_NAME, data.session.access_token, cookieOpts());
    res.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles').select('*').eq('id', req.user.id).maybeSingle();
    if (error) throw error;
    res.json({ user: { ...req.user, profile: data } });
  } catch (err) { next(err); }
});

const ProfileUpdateSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional(),
  city: z.string().max(120).optional(),
  language: z.enum(['en', 'ka']).optional(),
  avatar_url: z.string().url().optional(),
});
router.put('/me', csrfProtection, requireAuth, validate(ProfileUpdateSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles').update(req.body).eq('id', req.user.id).select().single();
    if (error) throw error;
    res.json({ profile: data });
  } catch (err) { next(err); }
});

// ---------- Email confirmation ----------
// Supabase sends a confirmation link to /api/auth/confirm?token_hash=...&type=signup.
// We verify the token_hash with Supabase Auth and then redirect to the frontend.
router.get('/confirm', async (req, res, next) => {
  try {
    const token_hash = String(req.query.token_hash || '');
    const type = String(req.query.type || 'signup');
    const frontend = process.env.PUBLIC_FRONTEND_ORIGIN || 'http://localhost:5173';

    if (!token_hash) return res.redirect(`${frontend}/en/auth?error=missing_token`);

    const { data, error } = await supabaseAuth.auth.verifyOtp({ type, token_hash });
    if (error) return res.redirect(`${frontend}/en/auth?error=${encodeURIComponent(error.message)}`);

    if (data?.session?.access_token) {
      res.cookie(SESSION_COOKIE_NAME, data.session.access_token, cookieOpts());
    }
    res.redirect(`${frontend}/en/auth/confirmed`);
  } catch (err) { next(err); }
});

// ---------- Password reset ----------
router.post('/forgot-password', authStrictLimiter, csrfProtection, validate(ForgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const frontend = process.env.PUBLIC_FRONTEND_ORIGIN || 'http://localhost:5173';
    // Supabase emits a recovery link via the configured SMTP (Maileroo).
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontend}/en/auth/reset-password`,
    });
    // Don't leak whether email exists — always 200.
    if (error) console.warn('[forgot-password]', error.message);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/reset-password', authStrictLimiter, csrfProtection, validate(ResetPasswordSchema), async (req, res, next) => {
  try {
    const { access_token, refresh_token, new_password } = req.body;

    // Validate the recovery access_token by reading the user it belongs to.
    const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser(access_token);
    if (userErr || !userRes?.user) return res.status(400).json({ error: 'invalid_token' });

    // Update password using the admin client (bypasses needing the session in the auth client).
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userRes.user.id, {
      password: new_password,
    });
    if (error) return res.status(400).json({ error: error.message });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---------- TOTP 2FA (admin-grade, but available to any logged-in user) ----------

router.post('/mfa/enroll', csrfProtection, requireAuth, validate(MfaEnrollSchema), async (req, res, next) => {
  try {
    // The Supabase MFA API is on the auth client; we forward the user's access token.
    const access = req.cookies?.[SESSION_COOKIE_NAME] || req.get('authorization')?.replace(/^Bearer /, '');
    if (!access) return res.status(401).json({ error: 'no_session' });
    const client = supabaseAuth;
    await client.auth.setSession({ access_token: access, refresh_token: 'x' }).catch(() => null);
    const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'BookBridge' });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ factor_id: data.id, totp: { qr_code: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri } });
  } catch (err) { next(err); }
});

router.post('/mfa/challenge', csrfProtection, requireAuth, validate(MfaChallengeSchema), async (req, res, next) => {
  try {
    const access = req.cookies?.[SESSION_COOKIE_NAME] || req.get('authorization')?.replace(/^Bearer /, '');
    if (!access) return res.status(401).json({ error: 'no_session' });
    await supabaseAuth.auth.setSession({ access_token: access, refresh_token: 'x' }).catch(() => null);
    const { data, error } = await supabaseAuth.auth.mfa.challenge({ factorId: req.body.factor_id });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ challenge_id: data.id });
  } catch (err) { next(err); }
});

router.post('/mfa/verify', authStrictLimiter, csrfProtection, requireAuth, validate(MfaVerifySchema.extend({ challenge_id: z.string().min(1) })), async (req, res, next) => {
  try {
    const access = req.cookies?.[SESSION_COOKIE_NAME] || req.get('authorization')?.replace(/^Bearer /, '');
    if (!access) return res.status(401).json({ error: 'no_session' });
    await supabaseAuth.auth.setSession({ access_token: access, refresh_token: 'x' }).catch(() => null);
    const { data, error } = await supabaseAuth.auth.mfa.verify({
      factorId: req.body.factor_id,
      challengeId: req.body.challenge_id,
      code: req.body.code,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true, aal: data?.user?.factors?.length ? 'aal2' : 'aal1' });
  } catch (err) { next(err); }
});

router.post('/mfa/unenroll', csrfProtection, requireAuth, async (req, res, next) => {
  try {
    const factorId = req.body?.factor_id;
    if (!factorId) return res.status(400).json({ error: 'missing_factor_id' });
    const access = req.cookies?.[SESSION_COOKIE_NAME] || req.get('authorization')?.replace(/^Bearer /, '');
    await supabaseAuth.auth.setSession({ access_token: access, refresh_token: 'x' }).catch(() => null);
    const { error } = await supabaseAuth.auth.mfa.unenroll({ factorId });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
