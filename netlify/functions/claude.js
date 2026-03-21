const { checkRateLimit, getClientIp, rateLimitResponse } = require("./_rateLimit");

const MAX_BODY_BYTES = 512_000; // 512 KB — AI prompts can be large

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Claude calls are expensive — stricter limit: 10 req/min per IP
  const rl = await checkRateLimit(getClientIp(event), 10, 60);
  if (!rl.allowed) return rateLimitResponse(rl.count, rl.limit);

  if (parseInt(event.headers["content-length"] || "0") > MAX_BODY_BYTES) {
    return { statusCode: 413, body: JSON.stringify({ error: "Payload demasiado grande" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Configuración del servidor incompleta" }),
    };
  }

  const securityHeaders = {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: securityHeaders, body: JSON.stringify({ error: "Body inválido" }) };
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { statusCode: 400, headers: securityHeaders, body: JSON.stringify({ error: "messages es requerido" }) };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        temperature: 0,
        messages: body.messages,
      }),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: securityHeaders,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("claude.js error:", err.message);
    return {
      statusCode: 500,
      headers: securityHeaders,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};
