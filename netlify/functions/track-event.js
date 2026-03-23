const { checkRateLimit, getClientIp, rateLimitResponse } = require("./_rateLimit");

const MAX_BODY_BYTES = 2_048;
const VALID_TYPES   = new Set(["kibana", "route-logs", "uber-logs", "waypoints-uber", "claude"]);
const VALID_STATUS  = new Set(["success", "not_found", "error"]);
const VALID_CLUSTER = /^(staging|[1-7])$/;

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const rl = await checkRateLimit(getClientIp(event), 60, 60);
  if (!rl.allowed) return rateLimitResponse(rl.count, rl.limit);

  if (parseInt(event.headers["content-length"] || "0") > MAX_BODY_BYTES) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }; // fail silently
  }

  const redisUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Body inválido" }) }; }

  const { type, cluster, query, status, duration_ms } = body;

  if (!VALID_TYPES.has(type) || !VALID_STATUS.has(status)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Parámetros inválidos" }) };
  }

  const now = Date.now();
  const eventData = JSON.stringify({
    type,
    cluster: cluster && VALID_CLUSTER.test(cluster) ? cluster : null,
    query:   typeof query === "string" ? query.slice(0, 100) : null,
    status,
    duration_ms: typeof duration_ms === "number" ? Math.round(duration_ms) : null,
  });

  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${redisToken}`,
  };

  try {
    await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers,
      body: JSON.stringify([
        ["ZADD", "usage_events", String(now), eventData],
        ["ZREMRANGEBYSCORE", "usage_events", "0", String(ninetyDaysAgo)],
      ]),
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("track-event.js error:", err.message);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }; // fail silently
  }
};
