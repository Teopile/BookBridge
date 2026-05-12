// Supabase JWT verification middleware.
// Reads "Authorization: Bearer <token>" or the session cookie set by /api/auth/session.
// Attaches req.user = { id, email, role } on success.

import { supabaseAuth, supabaseAdmin } from '../lib/supabase.js';

const SESSION_COOKIE = 'bb_session';
const userCache = new Map();
const CACHE_TTL_MS = 60_000;

function getCached(token) {
  const hit = userCache.get(token);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    userCache.delete(token);
    return null;
  }
  return hit.user;
}

function setCached(token, user) {
  userCache.set(token, { at: Date.now(), user });
}

async function loadUserFromToken(token) {
  const cached = getCached(token);
  if (cached) return cached;
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) return null;

  // Pull role from profiles (NOT app_metadata — that field is often null).
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, full_name, language')
    .eq('id', data.user.id)
    .maybeSingle();

  const user = {
    id: data.user.id,
    email: data.user.email,
    role: profile?.role || 'donor',
    full_name: profile?.full_name || '',
    language: profile?.language || 'en',
  };
  setCached(token, user);
  return user;
}

function extractToken(req) {
  const auth = req.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return req.cookies?.[SESSION_COOKIE] || null;
}

export async function attachUser(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = await loadUserFromToken(token);
    } catch {
      req.user = null;
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  next();
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
