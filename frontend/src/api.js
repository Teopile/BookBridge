// Fetch wrapper: prefixes API base, sends credentials, attaches CSRF header from the cookie set by the server.

const API_BASE = import.meta.env.VITE_API_BASE || '';

function readCookie(name) {
  return document.cookie
    .split('; ')
    .map((c) => c.split('='))
    .find(([k]) => k === name)?.[1];
}

export async function api(path, opts = {}) {
  const csrf = readCookie('bb_csrf');
  const headers = {
    'Content-Type': 'application/json',
    ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers,
    credentials: 'include',
  });
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
