// Pure PostgREST query-string helpers — no I/O, no Supabase client.
//
// Kept separate from store.js (which instantiates Supabase at import time) so
// they can be unit-tested without any client, env vars, or network.

// Build a PostgREST `.or()` filter that ILIKE-matches `raw` across `columns`.
// Strips quotes/backslashes and escapes LIKE wildcards so user input can't
// break out of the filter or inject wildcards.
export function buildIlikeOr(columns, raw) {
  const sanitized = String(raw).replace(/["\\]/g, '');
  const escapedForLike = sanitized.replace(/[%_]/g, '\\$&');
  const pattern = `%${escapedForLike}%`;
  return columns.map((col) => `${col}.ilike."${pattern}"`).join(',');
}
