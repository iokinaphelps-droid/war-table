// War Table AI Dungeon Master proxy (DigitalOcean Function).
// The browser never sees the LLM key: it lives in this function's environment.
//   ANTHROPIC_API_KEY   — required
//   SUPABASE_URL        — required (to verify the caller is a signed-in War Table user)
//   SUPABASE_ANON_KEY   — required
//   DM_MODEL            — optional, default claude-sonnet-4-5
//   DM_ALLOWED_EMAILS   — optional comma list; when set, only these accounts may use the DM
async function verifyUser(token) {
  if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null;
  try {
    const r = await fetch(process.env.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/user", {
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
async function main(args) {
  const cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "no-store" };
  const method = (args.__ow_method || "post").toLowerCase();
  if (method === "options") return { statusCode: 204, headers: cors, body: "" };
  if (!process.env.ANTHROPIC_API_KEY) return { statusCode: 503, headers: cors, body: { error: "The AI DM isn't set up yet — the server has no ANTHROPIC_API_KEY." } };
  const hdrs = args.__ow_headers || {};
  const token = String(hdrs.authorization || hdrs.Authorization || "").replace(/^Bearer\s+/i, "");
  const user = await verifyUser(token);
  if (!user || !user.email) return { statusCode: 401, headers: cors, body: { error: "Sign in to War Table to use the AI DM." } };
  const allow = (process.env.DM_ALLOWED_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (allow.length && !allow.includes(String(user.email).toLowerCase())) return { statusCode: 403, headers: cors, body: { error: "This account isn't on the AI DM allow-list." } };
  const system = String(args.system || "").slice(0, 60000);
  const messages = Array.isArray(args.messages) ? args.messages.slice(-60).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 8000) })) : [];
  if (!messages.length) return { statusCode: 400, headers: cors, body: { error: "No messages." } };
  const model = process.env.DM_MODEL || args.model || "claude-sonnet-4-5";
  const max_tokens = Math.min(4000, Math.max(200, parseInt(args.max_tokens, 10) || 1200));
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens, system, messages, temperature: args.temperature != null ? Number(args.temperature) : 0.9 }) });
    const j = await r.json();
    if (!r.ok) return { statusCode: r.status, headers: cors, body: { error: (j.error && j.error.message) || ("LLM error " + r.status) } };
    const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
    return { statusCode: 200, headers: cors, body: { text, usage: j.usage || null, model: j.model || model } };
  } catch (e) {
    return { statusCode: 502, headers: cors, body: { error: "Couldn't reach the LLM: " + String(e && e.message || e) } };
  }
}
exports.main = main;
