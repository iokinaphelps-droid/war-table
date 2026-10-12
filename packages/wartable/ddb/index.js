// DigitalOcean Functions port of the D&D Beyond character proxy.
// Browser can't call DDB directly (CORS); this fetches it server-side.
// Only works for characters set to Public on D&D Beyond.
async function main(args) {
  const cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
  let id = String(args.id || "").trim();
  const m = id.match(/characters\/(\d+)/); if (m) id = m[1];
  if (!/^\d+$/.test(id)) return { statusCode: 400, headers: cors, body: { error: "Provide a numeric D&D Beyond character id (or its URL)." } };
  try {
    const r = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${id}`, { headers: { "Accept": "application/json", "User-Agent": "WarTable/1.0" } });
    if (!r.ok) {
      const hint = (r.status === 404 || r.status === 403) ? " — the character may be private. On D&D Beyond: character → Edit → Home → Character Privacy → Public." : "";
      return { statusCode: r.status, headers: cors, body: { error: `D&D Beyond returned ${r.status}${hint}` } };
    }
    const j = await r.json();
    return { statusCode: 200, headers: cors, body: j.data || j };
  } catch (e) {
    return { statusCode: 502, headers: cors, body: { error: "Couldn't reach D&D Beyond: " + String(e && e.message || e) } };
  }
}
exports.main = main;
