import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth, SESSION_COOKIE_NAME } from '../middleware/auth.js';
import {
  RegisterSchema, LoginSchema,
  ForgotPasswordSchema, ResetPasswordSchema,
  VerifyOtpSchema, ResendOtpSchema,
} from '../schemas.js';
import { supabaseAuth, supabaseAdmin } from '../lib/supabase.js';
import { dbRateLimit } from '../lib/ratelimit.js';
import { sendEmail, Templates, mailerConfigured } from '../lib/mailer.js';

const router = Router();

// Strict per-route limiter for auth-sensitive endpoints.
// Skipped in development so local manual testing isn't blocked after a handful of attempts.
const authStrictLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
  skip: () => process.env.NODE_ENV !== 'production',
});

// Global (cross-serverless) per-IP limiter for auth-sensitive routes, backed by
// Postgres so it actually enforces on Vercel (the in-memory limiter above is
// per-instance). Layered: the DB limiter is the real global cap.
const authDbLimiter = dbRateLimit({ limit: 12, windowSec: 60, name: 'auth' });

const cookieOpts = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    // Cross-origin SPA in prod (different Render hosts) → SameSite=None+Secure.
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 60 * 24 * 30 * 1000,
  };
};

// ---------- Signup (email + username + password, sends 6-digit OTP) ----------
router.post('/register', authDbLimiter, authStrictLimiter, csrfProtection, validate(RegisterSchema), async (req, res, next) => {
  try {
    const { email, username, password, language } = req.body;

    // Pre-check: username must be available (case-insensitive).
    const { data: existing } = await supabaseAdmin
      .from('profiles').select('id').ilike('username', username).maybeSingle();
    if (existing) return res.status(409).json({ error: 'username_taken' });

    // Preferred path: mint the OTP ourselves (admin.generateLink creates the user
    // and returns the 6-digit email_otp WITHOUT Supabase sending any email), then
    // deliver it via Maileroo's HTTPS API. This removes the dependency on
    // Supabase's built-in mailer + its per-hour email rate limit, which was
    // silently dropping signup codes (signUp() returns 201 even when the email
    // never sends). verify-otp is unchanged — verifyOtp validates this same OTP.
    if (mailerConfigured()) {
      const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
        options: { data: { username, language } },
      });
      if (error) {
        if (/already.*regist|already.*exist|has already been registered/i.test(error.message)) {
          return res.status(409).json({ error: 'email_taken' });
        }
        return res.status(400).json({ error: error.message });
      }
      const code = linkData?.properties?.email_otp;
      if (!code) return res.status(502).json({ error: 'otp_generation_failed' });

      const tpl = Templates.signupOtp({ code, lang: language });
      try {
        const result = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
        if (result?.skipped) throw new Error('mailer_skipped');
      } catch (mailErr) {
        console.error('[register] OTP email send failed:', mailErr.message);
        return res.status(502).json({ error: 'email_send_failed' });
      }
      return res.status(201).json({ ok: true, needs_verification: true, email, via: 'direct' });
    }

    // Fallback (no Maileroo API key configured): let Supabase email the OTP via
    // its configured SMTP. The "Confirm signup" template must use {{ .Token }}.
    const { error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: { data: { username, language } },
    });
    if (error) {
      if (/already registered/i.test(error.message)) {
        return res.status(409).json({ error: 'email_taken' });
      }
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ ok: true, needs_verification: true, email, via: 'supabase' });
  } catch (err) { next(err); }
});

// ---------- Verify signup OTP — completes the account and signs the user in ----------
router.post('/verify-otp', authDbLimiter, authStrictLimiter, csrfProtection, validate(VerifyOtpSchema), async (req, res, next) => {
  try {
    const { email, token } = req.body;
    const { data, error } = await supabaseAuth.auth.verifyOtp({ email, token, type: 'signup' });
    if (error || !data?.user) return res.status(400).json({ error: error?.message || 'invalid_token' });

    if (data.session?.access_token) {
      res.cookie(SESSION_COOKIE_NAME, data.session.access_token, cookieOpts());
    }
    res.json({
      ok: true,
      user: { id: data.user.id, email: data.user.email },
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    });
  } catch (err) { next(err); }
});

// ---------- Resend the signup OTP if the user lost the first email ----------
router.post('/resend-otp', authDbLimiter, authStrictLimiter, csrfProtection, validate(ResendOtpSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    // Prefer self-send via Maileroo (same path as register); fall back to
    // Supabase's own resend if it isn't available. Always 200 — never leak
    // whether the email exists.
    if (mailerConfigured()) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'signup', email });
        const code = data?.properties?.email_otp;
        if (!error && code) {
          const tpl = Templates.signupOtp({ code });
          await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
          return res.json({ ok: true });
        }
        console.warn('[resend-otp] generateLink unavailable, falling back:', error?.message || 'no_otp');
      } catch (e) {
        console.error('[resend-otp] self-send failed, falling back:', e.message);
      }
    }
    const { error } = await supabaseAuth.auth.resend({ type: 'signup', email });
    if (error) console.warn('[resend-otp]', error.message);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---------- Login (email + password) ----------
router.post('/login', authDbLimiter, authStrictLimiter, csrfProtection, validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) {
      // Map "Email not confirmed" so the UI can offer the OTP step.
      if (/not confirmed/i.test(error.message)) {
        return res.status(403).json({ error: 'email_not_confirmed' });
      }
      return res.status(401).json({ error: error.message });
    }
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

// ---------- Current user ----------
// Note: not behind requireAuth — returns 200 + {user:null} when not authed.
// This avoids the browser logging a 401 console error on every public page load.
router.get('/me', async (req, res, next) => {
  try {
    if (!req.user) return res.json({ user: null });
    const { data, error } = await supabaseAdmin
      .from('profiles').select('*').eq('id', req.user.id).maybeSingle();
    if (error) throw error;
    res.json({ user: { ...req.user, profile: data } });
  } catch (err) { next(err); }
});

const ProfileUpdateSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  username: z.string().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/).optional(),
  city: z.string().max(120).optional(),
  language: z.enum(['en', 'ka']).optional(),
  avatar_url: z.string().url().optional(),
});
router.put('/me', csrfProtection, requireAuth, validate(ProfileUpdateSchema), async (req, res, next) => {
  try {
    // If username is changing, enforce case-insensitive uniqueness explicitly.
    if (req.body.username) {
      const { data: taken } = await supabaseAdmin
        .from('profiles').select('id').ilike('username', req.body.username).neq('id', req.user.id).maybeSingle();
      if (taken) return res.status(409).json({ error: 'username_taken' });
    }
    const { data, error } = await supabaseAdmin
      .from('profiles').update(req.body).eq('id', req.user.id).select().single();
    if (error) throw error;
    res.json({ profile: data });
  } catch (err) { next(err); }
});

// ---------- Delete my account (GDPR erasure) ----------
// Deletes the auth user. The DB cascades the profile row and sets the user's
// donor_user_id / owner_user_id / notification refs to NULL (donations are
// anonymized but kept; any school the user managed becomes unowned, not deleted).
router.delete('/me', csrfProtection, requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---------- Password reset (code-based: forgot → email arrives with 6-digit code → enter code + new password) ----------
router.post('/forgot-password', authDbLimiter, authStrictLimiter, csrfProtection, validate(ForgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    // The "Reset Password" email template must use {{ .Token }} so the user gets a 6-digit code.
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email);
    // Don't leak whether the email exists — always respond 200.
    if (error) console.warn('[forgot-password]', error.message);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/reset-password', authDbLimiter, authStrictLimiter, csrfProtection, validate(ResetPasswordSchema), async (req, res, next) => {
  try {
    const { email, token, new_password } = req.body;

    // Verify the recovery OTP first to confirm the requester controls the inbox.
    const { data, error } = await supabaseAuth.auth.verifyOtp({ email, token, type: 'recovery' });
    if (error || !data?.user) return res.status(400).json({ error: error?.message || 'invalid_token' });

    // Update password using the admin client (bypasses needing the user's session).
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      password: new_password,
    });
    if (updateErr) return res.status(400).json({ error: updateErr.message });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
