// Fetch wrapper for the admin SPA — see frontend/src/api.js for full notes.
// CSRF token comes from the `x-csrf-token` response header (cross-origin
// readable) with a same-origin cookie fallback for local dev.

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
  const res = await fetch(API_BASE + path, { ...opts, headers, credentials: 'include' });

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

export const apiGet = (p) => api(p);
export const apiPost = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b || {}) });
export const apiPut = (p, b) => api(p, { method: 'PUT', body: JSON.stringify(b || {}) });

// Download a non-JSON response (e.g. CSV export) as a file. Uses the same
// credentialed fetch so the admin session cookie is sent cross-origin.
export async function apiDownload(path, filename) {
  const res = await fetch(API_BASE + path, { credentials: 'include' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Export failed (${res.status}) ${text}`.trim());
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
