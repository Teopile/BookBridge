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
  const res = await fetch(API_BASE + path, { ...opts, headers, credentials: 'include' });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const apiGet = (p) => api(p);
export const apiPost = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b || {}) });
export const apiPut = (p, b) => api(p, { method: 'PUT', body: JSON.stringify(b || {}) });
