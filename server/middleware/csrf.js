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
  let token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    token = generateToken();
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,
      // In prod the SPA is on a different origin than the API; the cookie has to
      // travel cross-site for credentials:include to attach it. SameSite=None
      // requires Secure (HTTPS), which Render provides.
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: '/',
      maxAge: 60 * 60 * 24 * 7 * 1000,
    });
    req.cookies = { ...(req.cookies || {}), [COOKIE_NAME]: token };
  }
  // Also echo the token as a response header so cross-origin SPAs (where the
  // cookie isn't readable via document.cookie) can pick it up. The header is
  // already in Access-Control-Expose-Headers, so the browser exposes it.
  res.setHeader(HEADER_NAME, token);
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
