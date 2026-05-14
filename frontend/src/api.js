// Fetch wrapper: prefixes API base, sends credentials, attaches CSRF header.
//
// CSRF token sourcing:
//   1. Server echoes the token in the `x-csrf-token` response header on every
//      request (cross-origin readable, because the header is in
//      Access-Control-Expose-Headers).
//   2. We cache the most recent value and send it back on the next request.
//   3. Same-origin dev/local also gets the cookie, so we fall back to reading
//      `bb_csrf` from document.cookie until the first response lands.

const API_BASE = import.meta.env.VITE_API_BASE || '';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'bb_csrf';

let cachedCsrf = null;

function readCookie(name) {
  return document.cookie
    .split('; ')
    .map((c) => c.split('='))
    .find(([k]) => k === name)?.[1];
}

function currentCsrf() {
  if (cachedCsrf) return cachedCsrf;
  const cookie = readCookie(CSRF_COOKIE);
  return cookie ? decodeURIComponent(cookie) : null;
}

export async function api(path, opts = {}) {
  const csrf = currentCsrf();
  const headers = {
    'Content-Type': 'application/json',
    ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers,
    credentials: 'include',
  });

  // Refresh the cached CSRF token from the response header.
  const headerToken = res.headers.get(CSRF_HEADER);
  if (headerToken) cachedCsrf = headerToken;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const apiGet = (path) => api(path);
export const apiPost = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
export const apiPut = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body || {}) });
export const apiDelete = (path) => api(path, { method: 'DELETE' });
