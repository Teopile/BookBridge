// Double-submit cookie CSRF protection.
// - csrfInit: mounted globally; sets a cookie on first GET if missing.
// - csrfProtection: per-route; rejects unsafe methods unless cookie + header match.
// Webhook routes (Flitt, courier) should NOT use csrfProtection.

import crypto from 'node:crypto';

const COOKIE_NAME = 'bb_csrf';
const HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function csrfInit(req, res, next) {
  if (!req.cookies?.[COOKIE_NAME]) {
    const token = generateToken();
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 * 1000,
    });
    req.cookies = { ...(req.cookies || {}), [COOKIE_NAME]: token };
  }
  next();
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookie = req.cookies?.[COOKIE_NAME];
  const header = req.get(HEADER_NAME);
  if (!cookie || !header || cookie !== header) {
    return res.status(403).json({ error: 'csrf_mismatch' });
  }
  next();
}

export const CSRF_COOKIE_NAME = COOKIE_NAME;
export const CSRF_HEADER_NAME = HEADER_NAME;
