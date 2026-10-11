// Serverless proxy for D&D Beyond's character-service endpoint.
// A browser can't call DDB directly (CORS); this function fetches it server-side.
// Only works for characters whose privacy is set to Public on D&D Beyond.
exports.handler = async (event) => {
  const cors = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const q = event.queryStringParameters || {};
  let id = (q.id || "").trim();
  // Accept a full DDB URL or a bare id
  const m = id.match(/characters\/(\d+)/);
  if (m) id = m[1];
  if (!/^\d+$/.test(id)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Provide a numeric D&D Beyond character id (or its URL)." }) };
  }

  const url = `https://character-service.dndbeyond.com/character/v5/character/${id}`;
  try {
    const r = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "WarTable/1.0" } });
    if (!r.ok) {
      const hint = r.status === 404 || r.status === 403
        ? " — the character may be private. On D&D Beyond: character → Edit → Home → Character Privacy → Public."
        : "";
      return { statusCode: r.status, headers: cors, body: JSON.stringify({ error: `D&D Beyond returned ${r.status}${hint}` }) };
    }
    const j = await r.json();
    // The useful payload is under .data
    return { statusCode: 200, headers: cors, body: JSON.stringify(j.data || j) };
  } catch (e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Couldn't reach D&D Beyond: " + String(e && e.message || e) }) };
  }
};
