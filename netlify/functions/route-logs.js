// Escape " and \ inside an ES query_string quoted value
const { checkRateLimit, getClientIp, rateLimitResponse } = require("./_rateLimit");

function escapeKqlQuoted(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function validateIsoDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) throw new Error("Formato de fecha inválido");
  return d.toISOString();
}

const MAX_BODY_BYTES = 10_240;

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const rl = await checkRateLimit(getClientIp(event), 30, 60);
  if (!rl.allowed) return rateLimitResponse(rl.count, rl.limit);

  if (parseInt(event.headers["content-length"] || "0") > MAX_BODY_BYTES) {
    return { statusCode: 413, body: JSON.stringify({ error: "Payload demasiado grande" }) };
  }

  const kibanaUrl  = process.env.KIBANA_URL;
  const kibanaUser = process.env.KIBANA_USERNAME;
  const kibanaPass = process.env.KIBANA_PASSWORD;

  if (!kibanaUrl || !kibanaUser || !kibanaPass) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Configuración del servidor incompleta" }),
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Body inválido" }) }; }

  const { route_id, cluster } = body;
  if (!route_id) {
    return { statusCode: 400, body: JSON.stringify({ error: "route_id es requerido" }) };
  }

  let from, to;
  try {
    from = validateIsoDate(body.from);
    to   = validateIsoDate(body.to);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Formato de fecha inválido" }) };
  }

  const VALID_CLUSTER = /^(staging|[1-7])$/;
  const clusterName = cluster && VALID_CLUSTER.test(cluster) ? cluster : "3";
  const index  = `cluster-${clusterName}-lastmile-app-*`;
  const auth   = Buffer.from(`${kibanaUser}:${kibanaPass}`).toString("base64");
  const base   = kibanaUrl.replace(/\/$/, "");
  const esUrl  = `${base}/api/console/proxy?path=${encodeURIComponent(index + "/_search")}&method=POST`;

  const safeRouteId = escapeKqlQuoted(route_id);

  const query = {
    size: 500,
    query: {
      bool: {
        must: [
          { query_string: { query: `log: "${safeRouteId}" AND NOT log: "GET"` } },
          ...(from || to ? [{
            range: {
              "@timestamp": {
                ...(from ? { gte: from } : {}),
                ...(to   ? { lte: to   } : {}),
              },
            },
          }] : []),
        ],
      },
    },
    sort: [{ "@timestamp": { order: "desc" } }],
  };

  const securityHeaders = {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  };

  try {
    const esResp = await fetch(esUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
        "kbn-xsrf": "true",
      },
      body: JSON.stringify(query),
    });

    if (!esResp.ok) {
      console.error(`Kibana error ${esResp.status} for cluster ${clusterName}`);
      return {
        statusCode: esResp.status,
        headers: securityHeaders,
        body: JSON.stringify({ error: "Error al consultar el servidor de logs" }),
      };
    }

    const esData = await esResp.json();
    const hits = esData.hits?.hits ?? [];

    if (hits.length === 0) {
      return {
        statusCode: 404,
        headers: securityHeaders,
        body: JSON.stringify({ error: `No se encontraron logs para route_id "${route_id}"` }),
      };
    }

    return {
      statusCode: 200,
      headers: securityHeaders,
      body: JSON.stringify({ hits, total: esData.hits?.total?.value ?? hits.length }),
    };
  } catch (err) {
    console.error("route-logs.js error:", err.message);
    return {
      statusCode: 500,
      headers: securityHeaders,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};
