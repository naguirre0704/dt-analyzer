/**
 * Rate limiting via Upstash Redis REST API.
 * Uses a fixed window counter per IP address.
 *
 * Setup:
 *   1. Create free account at https://console.upstash.com
 *   2. Create a Redis database (free tier: 10,000 req/day)
 *   3. Add to Netlify env vars (or local .env):
 *        UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
 *        UPSTASH_REDIS_REST_TOKEN=your_token_here
 *
 * If env vars are not configured, rate limiting is skipped (fail open).
 */

/**
 * @param {string} ip        — client IP address
 * @param {number} limit     — max requests allowed in the window
 * @param {number} windowSec — window size in seconds
 * @returns {{ allowed: boolean, count: number, limit: number }}
 */
async function checkRateLimit(ip, limit = 30, windowSec = 60) {
  const redisUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Fail open: if Upstash is not configured, allow all requests
  if (!redisUrl || !redisToken) {
    return { allowed: true, count: 0, limit };
  }

  // Sanitize IP to use as a safe Redis key
  const safeIp = (ip || "unknown").replace(/[^a-zA-Z0-9.:_-]/g, "_").slice(0, 64);
  const key = `rl:${safeIp}`;

  const headers = {
    Authorization: `Bearer ${redisToken}`,
    "Content-Type": "application/json",
  };

  try {
    // Atomic pipeline: INCR then EXPIRE (only sets TTL on first request of the window)
    const pipeline = [
      ["INCR", key],
      ["EXPIRE", key, windowSec, "NX"], // NX = only set if key has no expiry yet
    ];

    const resp = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers,
      body: JSON.stringify(pipeline),
    });

    if (!resp.ok) {
      // If Redis is unreachable, fail open
      console.error("Upstash rate limit check failed:", resp.status);
      return { allowed: true, count: 0, limit };
    }

    const results = await resp.json();
    const count = results[0]?.result ?? 0;

    return { allowed: count <= limit, count, limit };
  } catch (err) {
    // Network error — fail open to avoid blocking legitimate users
    console.error("Rate limit error:", err.message);
    return { allowed: true, count: 0, limit };
  }
}

/**
 * Extract the real client IP from Netlify event headers.
 * Netlify sets x-nf-client-connection-ip for the real IP.
 */
function getClientIp(event) {
  return (
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    event.headers["client-ip"] ||
    "unknown"
  );
}

/**
 * Ready-to-use rate limit response (429 Too Many Requests).
 */
function rateLimitResponse(count, limit) {
  return {
    statusCode: 429,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": "0",
      "Retry-After": "60",
      "X-Content-Type-Options": "nosniff",
    },
    body: JSON.stringify({
      error: "Demasiadas solicitudes. Intenta de nuevo en un minuto.",
    }),
  };
}

module.exports = { checkRateLimit, getClientIp, rateLimitResponse };
