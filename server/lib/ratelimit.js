// Optional distributed rate limiter (dependency-free, env-gated).
//
// The default limiter in index.js is express-rate-limit's in-memory store,
// which resets on every serverless cold start and is per-instance. When both
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, this module
// provides a shared fixed-window limiter backed by Upstash's REST API so the
// count is global across instances and survives cold starts.
//
// Design notes:
//   - No new npm dependencies: uses the global fetch + Upstash REST pipeline.
//   - Fixed window keyed by IP + minute bucket: INCR the counter, and on the
//     first hit set an EXPIRE so stale keys self-clean.
//   - Fails OPEN: if Upstash is misconfigured, unreachable, or returns an
//     error, the request is allowed through. A limiter outage must never take
//     down the API for real users.

const WINDOW_SECONDS = 60;

/**
 * Is the distributed limiter configured? True only when BOTH Upstash env vars
 * are present. When false, callers fall back to the in-memory limiter.
 * @returns {boolean}
 */
export function isUpstashConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/**
 * Resolve the configured per-minute request limit. Mirrors index.js so both
 * limiters share the same RATE_LIMIT_PER_MIN setting.
 * @returns {number}
 */
function resolveLimit() {
  return Number(process.env.RATE_LIMIT_PER_MIN) || 120;
}

/**
 * Build the per-IP, per-minute window key. Sharing the minute bucket across
 * instances is what makes the limit global.
 * @param {string} ip
 * @returns {string}
 */
function windowKey(ip) {
  const minute = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  return `rl:${ip}:${minute}`;
}

/**
 * Run INCR (and EXPIRE on first hit) for a key via the Upstash REST pipeline.
 * Throws on any transport or Upstash-level error so the caller can fail open.
 * @param {string} key
 * @returns {Promise<number>} the post-increment counter value
 */
async function incrWithExpire(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, String(WINDOW_SECONDS), 'NX'],
    ]),
  });

  if (!res.ok) {
    throw new Error(`Upstash REST ${res.status}`);
  }

  // Pipeline replies: [{ result: <incr> }, { result: <expire> }].
  const body = await res.json();
  if (!Array.isArray(body) || body.length === 0) {
    throw new Error('Upstash REST malformed response');
  }
  const first = body[0];
  if (first && first.error) {
    throw new Error(`Upstash command error: ${first.error}`);
  }
  return Number(first?.result);
}

/**
 * Express middleware factory for the Upstash-backed limiter. Returns 429 when
 * the per-IP minute count exceeds RATE_LIMIT_PER_MIN; fails open (allows the
 * request) and logs once if the Upstash call throws.
 * @returns {import('express').RequestHandler}
 */
export function createUpstashLimiter() {
  const limit = resolveLimit();

  return async function upstashLimiter(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = windowKey(ip);

    try {
      const count = await incrWithExpire(key);

      // Standard rate-limit headers, mirroring express-rate-limit's standardHeaders.
      const remaining = Math.max(0, limit - count);
      res.setHeader('RateLimit-Limit', String(limit));
      res.setHeader('RateLimit-Remaining', String(remaining));

      if (Number.isFinite(count) && count > limit) {
        res.setHeader('Retry-After', String(WINDOW_SECONDS));
        return res.status(429).json({ error: 'too_many_requests' });
      }
      return next();
    } catch (err) {
      // Fail OPEN: never block real users because the limiter backend is down.
      console.error('[ratelimit] Upstash unavailable, allowing request:', err?.message || err);
      return next();
    }
  };
}
