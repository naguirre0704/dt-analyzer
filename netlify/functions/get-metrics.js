const { checkRateLimit, getClientIp, rateLimitResponse } = require("./_rateLimit");

const securityHeaders = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const rl = await checkRateLimit(getClientIp(event), 30, 60);
  if (!rl.allowed) return rateLimitResponse(rl.count, rl.limit);

  const redisUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    return {
      statusCode: 200,
      headers: securityHeaders,
      body: JSON.stringify({ events: [], totals: {}, by_day: [], by_hour: [] }),
    };
  }

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  try {
    const resp = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${redisToken}` },
      body: JSON.stringify([
        ["ZRANGEBYSCORE", "usage_events", String(thirtyDaysAgo), String(now), "WITHSCORES"],
        ["ZCARD", "usage_events"],
      ]),
    });

    const results = await resp.json();
    const rawItems   = results[0]?.result ?? [];
    const totalAll   = results[1]?.result ?? 0;

    // Parse alternating [value, score, value, score, ...]
    const events = [];
    for (let i = 0; i < rawItems.length; i += 2) {
      try {
        const data = JSON.parse(rawItems[i]);
        const ts   = parseInt(rawItems[i + 1]);
        events.push({ ...data, timestamp: new Date(ts).toISOString(), ts });
      } catch {}
    }

    // Sort desc for table
    const eventsSorted = [...events].sort((a, b) => b.ts - a.ts);

    // Totals by type
    const TYPES = ["kibana", "route-logs", "uber-logs", "waypoints-uber", "claude"];
    const totals = { all: events.length };
    for (const t of TYPES) {
      totals[t] = events.filter((e) => e.type === t).length;
    }

    // By day (last 30 days)
    const byDayMap = {};
    for (const e of events) {
      const day = e.timestamp.slice(0, 10);
      byDayMap[day] = (byDayMap[day] || 0) + 1;
    }
    const byDay = [];
    for (let i = 29; i >= 0; i--) {
      const d   = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      byDay.push({ date: key, count: byDayMap[key] || 0 });
    }

    // By hour (today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const byHourMap = {};
    for (const e of events) {
      if (e.ts >= todayStart.getTime()) {
        const h = new Date(e.ts).getHours();
        byHourMap[h] = (byHourMap[h] || 0) + 1;
      }
    }
    const byHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: byHourMap[h] || 0,
    }));

    return {
      statusCode: 200,
      headers: securityHeaders,
      body: JSON.stringify({
        events: eventsSorted.slice(0, 100),
        totals,
        by_day: byDay,
        by_hour: byHour,
        total_all_time: totalAll,
      }),
    };
  } catch (err) {
    console.error("get-metrics.js error:", err.message);
    return {
      statusCode: 500,
      headers: securityHeaders,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};
