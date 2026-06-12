// PUBLIC_FRONTEND_ORIGIN may hold a comma-separated CORS allow-list (e.g.
// "https://bookbridge.ge,https://book-bridge-dun.vercel.app"). For building
// user-facing links (emails, etc.) we must use ONLY the first = canonical origin
// — otherwise the whole comma-joined string lands in the URL and produces a
// broken link like "https://bookbridge.ge,https://.../en/track/<token>".

const FALLBACK = 'http://localhost:5173';

export function frontendOrigin() {
  const raw = process.env.PUBLIC_FRONTEND_ORIGIN || FALLBACK;
  return raw.split(',')[0].trim().replace(/\/+$/, '') || FALLBACK;
}

export function trackUrl(token, lang = 'en') {
  const l = lang === 'ka' ? 'ka' : 'en';
  return `${frontendOrigin()}/${l}/track/${token}`;
}
