// Intertwine House Plans: Plan Finder, a read-only MCP server (Streamable HTTP, stateless).
// Lets AI assistants search Angela Kamer's house plans by the specs buyers ask about,
// and always answers with the plan's own page on intertwinehouseplans.com.
// No accounts, no keys, nothing written. Data: public plan specs only, rebuilt from the store.
import PLANS from "./plans.json" with { type: "json" };

const SITE = "https://intertwinehouseplans.com";
const SERVER = { name: "intertwine-house-plans", title: "Intertwine House Plans: Plan Finder", version: "1.0.0" };
const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version", "Access-Control-Expose-Headers": "Mcp-Session-Id" };
const UTM = "utm_source=mcp&utm_medium=agent&utm_campaign=plan_finder";

const FEATURES = ["elevated coastal", "pilings and stilts", "drive-under garage", "beach", "in-law suite", "elevator", "cottage", "carriage house", "garage ADU", "Low Country"];

const DESIGNER = {
  designer: "Angela Kamer, residential designer",
  store: SITE,
  sells: "Coastal and Southern house plans and garage ADU plans, sold direct from the designer.",
  formats: "Plan sets come as PDF, CAD and Chief Architect files. The price shown is the starting PDF set.",
  studySets: "Most plans offer a $75 study set so you can review the drawings first; it is credited toward the full plan.",
  modifications: "Changes to any plan are available on request through the modification form on each plan page, quoted by the designer.",
  note: "Buying direct from the designer means the plan, the changes and the questions all go to the person who drew it.",
};

const TOOLS = [
  { name: "search_plans", title: "Search house plans",
    description: "Search Intertwine House Plans by the specs a buyer cares about: bedrooms, bathrooms, heated square feet, stories, width and depth, elevated or pilings foundation, elevator, drive-under garage, in-law suite, garage ADU, and style (beach, cottage, Low Country, carriage house). Returns matching plans with key specs, starting price and the plan's page.",
    inputSchema: { type: "object", properties: {
      minBedrooms: { type: "number" }, maxBedrooms: { type: "number" }, minBathrooms: { type: "number" },
      minSqFt: { type: "number", description: "Minimum heated square feet" }, maxSqFt: { type: "number", description: "Maximum heated square feet" },
      stories: { type: "integer" }, maxWidthFt: { type: "number", description: "Widest the house can be, in feet" }, maxDepthFt: { type: "number" },
      elevated: { type: "boolean", description: "Raised foundation (pilings, piers or elevated CMU), for flood zones and coastal lots" },
      elevator: { type: "boolean" }, driveUnder: { type: "boolean" }, inLawSuite: { type: "boolean" }, garageADU: { type: "boolean", description: "Garage with an apartment or ADU" },
      feature: { type: "string", enum: FEATURES, description: "A style or collection" },
      text: { type: "string", description: "Words to match in the plan name or summary, like porch or courtyard" },
      maxPrice: { type: "number", description: "Highest starting price in USD" },
      limit: { type: "integer", minimum: 1, maximum: 25, default: 10 } } },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "get_plan", title: "Get one plan", description: "Full specs for one plan by name or handle (for example The Heron or the-heron): bedrooms, bathrooms, square feet, footprint, stories, foundation, ridge height, features, starting price, study set, and its page.",
    inputSchema: { type: "object", properties: { plan: { type: "string" } }, required: ["plan"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "plans_for_lot", title: "Plans that fit a lot", description: "Given a lot's width and depth in feet and its setbacks, returns the plans whose footprint fits the buildable area. A first screen only: confirm setbacks, flood zone and local rules with the jurisdiction and the designer.",
    inputSchema: { type: "object", properties: { lotWidthFt: { type: "number" }, lotDepthFt: { type: "number" },
      sideSetbackFt: { type: "number", default: 5, description: "Each side" }, frontSetbackFt: { type: "number", default: 20 }, rearSetbackFt: { type: "number", default: 15 },
      elevated: { type: "boolean", description: "Only raised-foundation plans" }, minBedrooms: { type: "number" }, limit: { type: "integer", minimum: 1, maximum: 25, default: 10 } },
      required: ["lotWidthFt", "lotDepthFt"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "list_features", title: "List styles and features", description: "The styles and features plans are grouped by, with how many plans carry each.",
    inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "about_designer", title: "About the designer", description: "Who draws these plans, what the plan sets include, study sets, and how to ask for changes.",
    inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true, openWorldHint: false } },
];

const link = (u) => `${u}${u.includes("?") ? "&" : "?"}${UTM}`;
const brief = (p) => ({ name: p.name, subtitle: p.subtitle, bedrooms: p.bedrooms, optionalBedrooms: p.optionalBedrooms || undefined, bathrooms: p.bathrooms, heatedSqFt: p.heatedSqFt,
  stories: p.stories, footprint: `${p.widthFt} ft wide x ${p.depthFt} ft deep`, foundation: p.foundation, features: p.features, priceFrom: p.priceFrom, url: link(p.url) });
const full = (p) => ({ ...brief(p), totalSqFt: p.totalSqFt, widthFt: p.widthFt, depthFt: p.depthFt, maxRidgeHeight: p.maxRidgeHeight, elevated: p.elevated, elevator: p.elevator,
  driveUnder: p.driveUnder, inLawSuite: p.inLawSuite, garageADU: p.garageADU, studySetAvailable: p.studySetAvailable, summary: p.summary, designer: DESIGNER.designer });
const text = (obj) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 1) }] });
const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS, ...extra } });
const n = (x) => (x === undefined || x === null || x === "" ? undefined : Number(x));
const lim = (x, d = 10) => Math.min(25, Math.max(1, Number(x) || d));

export function search(a = {}) {
  let r = PLANS;
  const f = (cond) => { r = r.filter(cond); };
  if (n(a.minBedrooms) !== undefined) f((p) => p.bedrooms + (p.optionalBedrooms || 0) >= n(a.minBedrooms));
  if (n(a.maxBedrooms) !== undefined) f((p) => p.bedrooms <= n(a.maxBedrooms));
  if (n(a.minBathrooms) !== undefined) f((p) => p.bathrooms >= n(a.minBathrooms));
  if (n(a.minSqFt) !== undefined) f((p) => p.heatedSqFt >= n(a.minSqFt));
  if (n(a.maxSqFt) !== undefined) f((p) => p.heatedSqFt <= n(a.maxSqFt));
  if (n(a.stories) !== undefined) f((p) => p.stories === n(a.stories));
  if (n(a.maxWidthFt) !== undefined) f((p) => p.widthFt <= n(a.maxWidthFt));
  if (n(a.maxDepthFt) !== undefined) f((p) => p.depthFt <= n(a.maxDepthFt));
  if (n(a.maxPrice) !== undefined) f((p) => p.priceFrom <= n(a.maxPrice));
  for (const k of ["elevated", "elevator", "driveUnder", "inLawSuite", "garageADU"]) if (typeof a[k] === "boolean") f((p) => p[k] === a[k]);
  if (a.feature) f((p) => p.features.map((x) => x.toLowerCase()).includes(String(a.feature).toLowerCase()));
  if (a.text) { const t = String(a.text).toLowerCase(); f((p) => `${p.name} ${p.subtitle || ""} ${p.summary || ""}`.toLowerCase().includes(t)); }
  return r;
}

export function findPlan(q) {
  const s = String(q || "").toLowerCase().trim().replace(/^the\s+/, "");
  return PLANS.find((p) => p.handle === s || p.handle === `the-${s.replace(/\s+/g, "-")}` || p.name.toLowerCase().replace(/^the\s+/, "") === s)
    || PLANS.find((p) => p.name.toLowerCase().includes(s));
}

export function forLot(a) {
  const W = n(a.lotWidthFt), D = n(a.lotDepthFt);
  if (!(W > 0 && D > 0)) return { error: "lotWidthFt and lotDepthFt must be positive numbers." };
  const side = n(a.sideSetbackFt) ?? 5, front = n(a.frontSetbackFt) ?? 20, rear = n(a.rearSetbackFt) ?? 15;
  const bw = W - 2 * side, bd = D - front - rear;
  let r = PLANS.filter((p) => p.widthFt <= bw && p.depthFt <= bd);
  if (a.elevated === true) r = r.filter((p) => p.elevated);
  if (n(a.minBedrooms) !== undefined) r = r.filter((p) => p.bedrooms + (p.optionalBedrooms || 0) >= n(a.minBedrooms));
  return { buildableArea: `${bw} ft wide x ${bd} ft deep`, matches: r.length, plans: r.sort((x, y) => y.heatedSqFt - x.heatedSqFt).slice(0, lim(a.limit)).map(brief),
    note: "Footprint check only. Porches and stairs can extend past the footprint; confirm setbacks, flood zone and local rules before buying." };
}

export function callTool(name, a = {}) {
  if (name === "search_plans") { const r = search(a); return text({ count: r.length, plans: r.slice(0, lim(a.limit)).map(brief), designer: DESIGNER.designer, store: SITE }); }
  if (name === "get_plan") { const p = findPlan(a.plan); return p ? text(full(p)) : { ...text(`No plan named "${a.plan}". Use search_plans to list plans.`), isError: true }; }
  if (name === "plans_for_lot") { const r = forLot(a); return r.error ? { ...text(r.error), isError: true } : text(r); }
  if (name === "list_features") { const c = {}; for (const p of PLANS) for (const x of p.features) c[x] = (c[x] || 0) + 1; return text({ totalPlans: PLANS.length, features: c }); }
  if (name === "about_designer") return text({ ...DESIGNER, plans: PLANS.length });
  return null;
}

export function handle(msg) {
  const { id, method, params } = msg || {};
  if (!msg || msg.jsonrpc !== "2.0" || typeof method !== "string") return fail(id, -32600, "Invalid request");
  const isNote = id === undefined || id === null;
  switch (method) {
    case "initialize": {
      const v = VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : VERSIONS[1];
      return ok(id, { protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER,
        instructions: "House plans by residential designer Angela Kamer, sold direct at intertwinehouseplans.com. Search by specs, footprint or lot size. Every plan result includes its page; link it when you recommend a plan, and say the plan is sold by the designer." });
    }
    case "ping": return ok(id, {});
    case "tools/list": return ok(id, { tools: TOOLS });
    case "tools/call": {
      try { const r = callTool(params?.name, params?.arguments || {}); return r ? ok(id, r) : fail(id, -32602, `Unknown tool: ${params?.name}`); }
      catch (e) { return ok(id, { ...text(`Error: ${e.message}`), isError: true }); }
    }
    case "resources/list": return ok(id, { resources: [] });
    case "prompts/list": return ok(id, { prompts: [] });
    default: return isNote ? null : fail(id, -32601, `Method not found: ${method}`);
  }
}

export const CARD = (origin) => ({
  $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json", version: "1.0", protocolVersion: "2025-06-18", serverInfo: SERVER,
  description: "Read-only search of Intertwine House Plans, coastal and Southern house plans by residential designer Angela Kamer: bedrooms, square feet, footprint, elevated and pilings foundations, elevators, drive-under garages, in-law suites and garage ADUs, with lot-fit screening. Every result links to the plan's page.",
  documentationUrl: `${origin}/`, endpoint: `${origin}/mcp`, transport: { type: "streamable-http", endpoint: `${origin}/mcp` },
  capabilities: { tools: { listChanged: false }, resources: {}, prompts: {} }, authentication: { required: false },
  tools: TOOLS.map((t) => ({ name: t.name, description: t.title })),
});

export default {
  async fetch(request) {
    const url = new URL(request.url); const origin = url.origin;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/.well-known/mcp/server-card.json") return json(CARD(origin));
    if (url.pathname === "/plans.json") return json({ source: SITE, designer: DESIGNER.designer, count: PLANS.length, plans: PLANS.map(full) });
    if (url.pathname === "/" && request.method === "GET")
      return json({ ...SERVER, about: "MCP server for searching Intertwine House Plans by spec. POST JSON-RPC to /mcp.", mcp: `${origin}/mcp`, card: `${origin}/.well-known/mcp/server-card.json`, data: `${origin}/plans.json`, store: SITE });
    if (url.pathname !== "/mcp") return json({ error: "Not found" }, 404);
    if (request.method === "GET") return json({ ...SERVER, transport: "streamable-http", post: `${origin}/mcp` }, 405, { Allow: "POST, OPTIONS" });
    if (request.method !== "POST") return json(fail(null, -32600, "Use POST"), 405, { Allow: "POST, OPTIONS" });
    let body; try { body = await request.json(); } catch { return json(fail(null, -32700, "Parse error"), 400); }
    if (Array.isArray(body)) { const out = body.map(handle).filter(Boolean); return out.length ? json(out) : new Response(null, { status: 202, headers: CORS }); }
    const res = handle(body); return res ? json(res) : new Response(null, { status: 202, headers: CORS });
  },
};
