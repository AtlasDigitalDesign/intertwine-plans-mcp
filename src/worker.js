// Intertwine House Plans: Plan Finder, a read-only MCP server (Streamable HTTP, stateless).
// Lets AI assistants search Angela Kamer's house plans by the specs buyers ask about,
// and always answers with the plan's own page on intertwinehouseplans.com.
// No accounts, no keys, nothing written.
// Specs are baked in (plans.json). Photos, package prices, sale prices, the full write-up,
// study sets and the FAQ are read live from the store's public pages, cached for 30 minutes.
// If the store can't be reached, every tool still answers from the baked specs.
import PLANS from "./plans.json" with { type: "json" };

const SITE = "https://intertwinehouseplans.com";
const SERVER = { name: "intertwine-house-plans", title: "Intertwine House Plans: Plan Finder", version: "1.2.0" };
const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version", "Access-Control-Expose-Headers": "Mcp-Session-Id" };
const UTM = "utm_source=mcp&utm_medium=agent&utm_campaign=plan_finder";
const LIVE_TTL_MS = 30 * 60 * 1000;
const MAX_IMAGES = 8;
const GLAMA_CLAIM = "glama_claim_FedZeY2NDZq66_6CNoDKVam8Q3bKL0rr";

const FEATURES = ["elevated coastal", "pilings and stilts", "drive-under garage", "beach", "in-law suite", "elevator", "cottage", "carriage house", "garage ADU", "Low Country"];

const DESIGNER = {
  designer: "Angela Kamer, residential designer",
  store: SITE,
  background: "A professional spatial designer with a degree in Computer Graphics Technology from Purdue University and studies in interior architecture, with 16+ years of custom home design including a decade in custom construction in Charleston, SC. She specializes in resilient coastal homes for flood and hurricane zones.",
  sells: "Coastal and Southern house plans and garage ADU plans, sold direct from the designer.",
  formats: "Plan sets come as PDF, PDF plus CAD for an engineer, or Chief Architect files. Foundation can be chosen per plan; some foundations add a fee. get_plan lists the packages and prices for each plan.",
  studySets: "Most plans offer a $75 study set (dimensioned floor plans and elevations) so you can review the drawings and get builder pricing first. The full $75 is credited toward the construction set of the same plan for 12 months.",
  modifications: "Any plan can be changed. Modification quotes are free; most requests get an answer within 1 to 2 business days.",
  modificationRequest: `${SITE}/pages/modification-request`,
  note: "Buying direct from the designer means the plan, the changes and the questions all go to the person who drew it.",
};

// Help topics. Text is from the store's own pages; the FAQ is read live.
const HELP = {
  whats_included: { title: "What's in a plan set", url: `${SITE}/pages/whats-included`, text:
    "PDF set: cover sheet with general notes, foundation plan, floor plans with dimensions, exterior elevations, cross section, door and window schedules, roof plan, electrical plans, and cabinetry elevations on most plans (ask to confirm). Not included: architectural or engineering stamp, site plan, mechanical drawings, plumbing drawings and energy calculations; those are handled locally when required. Chief Architect purchase: .plan and .layout files for the current Chief Architect (X18) or Home Designer 2027, all materials and textures for 3D viewing, and the PDF set. Readable Reverse add-on: a right-reading mirror image of the plan with all dimensions and text still readable." },
  study_sets: { title: "Study sets, $75", url: `${SITE}/collections/study-sets`, text:
    "A study set is a reduced-size PDF of one plan's fully dimensioned floor plans and exterior elevations: every level of living space, all four sides, door and window schedules, and a specification sheet (heated area by floor, porches, garage, footprint, ceiling heights, foundation type, roof pitch). It is enough to get two or three builders to price the house and to check the house on your lot. The full $75 is credited against the construction set for that plan for twelve months. It is not buildable: no usable scale, foundation plan, framing, sections or electrical, and no license to build. get_plan shows whether a plan has one and links it." },
  modifications: { title: "Changing a plan", url: `${SITE}/pages/modification-request`, text:
    "Every plan can be changed to fit the lot and the way the buyer lives: adjusting the footprint, swapping a foundation type, adding a bedroom, redesigning an outdoor space. Quotes are free. Submit the modification request form and the designer reviews it; most requests get an answer within 1 to 2 business days." },
  cost_to_build: { title: "Cost to build", url: `${SITE}/pages/cost-to-build`, text:
    "The store deliberately does not publish a cost-to-build calculator. Calculators apply a national cost database to square footage, but most of the budget depends on things they cannot see: the lot (slope, soil, clearing, utility runs, access), the foundation the site and flood zone require, the finish level, local labor and current material prices, and local engineering, elevation and energy requirements. The advice: get a range, not a bid, from two or three local builders using a dimensioned floor plan, elevations and the lot address; the spread between them is the useful number. A $75 study set gives builders enough to price from and is credited toward the plan." },
  built_homes: { title: "Plans that have been built", url: `${SITE}/pages/explore-our-built-house-plans`, text:
    "Photographs of finished houses built from the catalog, as builders and owners completed them. Built examples include Magnolia Cottage (elevated coastal cottage), the Winthrop garage ADU and Little Maple. The page also features the garage ADU family (Winthrop, Wilbury, Perry, Cliffwood, Meyer) and the Magnolia and Palmetto Beach Huts.",
    plans: ["magnolia-cottage", "winthrop-garage-adu-plan-1-bedroom", "little-maple"] },
  faq: { title: "Frequently asked questions", url: `${SITE}/pages/faq`, text: "Read live from the store's FAQ page." },
};

const TOOLS = [
  { name: "search_plans", title: "Search house plans",
    description: "Search Intertwine House Plans by the specs a buyer cares about: bedrooms, bathrooms, heated square feet, stories, width and depth, elevated or pilings foundation, elevator, drive-under garage, in-law suite, garage ADU, and style (beach, cottage, Low Country, carriage house). Returns matching plans with key specs, a photo, the current starting price (and sale price when one is running) and the plan's page.",
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
  { name: "get_plan", title: "Get one plan", description: "Everything about one plan, by name, other published name, or handle (for example The Heron or the-heron): specs, footprint, foundation options, garage, ceilings, roof pitch, framing, smallest lot it suits, photos and floor plans, every package with its current and regular price, the full design write-up, the study set link and price, how to request changes, and its page.",
    inputSchema: { type: "object", properties: { plan: { type: "string" } }, required: ["plan"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "plans_for_lot", title: "Plans that fit a lot", description: "Given a lot's width and depth in feet and its setbacks, returns the plans whose footprint fits the buildable area. A first screen only: confirm setbacks, flood zone and local rules with the jurisdiction and the designer.",
    inputSchema: { type: "object", properties: { lotWidthFt: { type: "number" }, lotDepthFt: { type: "number" },
      sideSetbackFt: { type: "number", default: 5, description: "Each side" }, frontSetbackFt: { type: "number", default: 20 }, rearSetbackFt: { type: "number", default: 15 },
      elevated: { type: "boolean", description: "Only raised-foundation plans" }, minBedrooms: { type: "number" }, limit: { type: "integer", minimum: 1, maximum: 25, default: 10 } },
      required: ["lotWidthFt", "lotDepthFt"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "list_features", title: "List styles and features", description: "The styles and features plans are grouped by, with how many plans carry each.",
    inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "about_designer", title: "About the designer", description: "Who draws these plans, what plan sets come as, study sets, and how to ask for changes.",
    inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "buying_help", title: "Buying help", description: "Answers a buyer's questions before purchase: what a plan set includes, study sets, changing a plan, why there is no cost-to-build calculator and how to get a real number, plans that have been built (with photos), and the store's FAQ. Optionally pass words to match FAQ questions.",
    inputSchema: { type: "object", properties: { topic: { type: "string", enum: Object.keys(HELP) }, question: { type: "string", description: "Words to match in the FAQ, like license or permit" } }, required: ["topic"] },
    annotations: { readOnlyHint: true, openWorldHint: false } },
];

// ---------- helpers ----------
const link = (u) => `${u}${u.includes("?") ? "&" : "?"}${UTM}`;
const text = (obj) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 1) }] });
const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS, ...extra } });
const n = (x) => (x === undefined || x === null || x === "" ? undefined : Number(x));
const lim = (x, d = 10) => Math.min(25, Math.max(1, Number(x) || d));
const money = (x) => (x === undefined || x === null || x === "" ? undefined : Math.round(Number(x) * 100) / 100);

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
export function htmlToText(html = "") {
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|h[1-6]|li|div|ul)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#?\w+);/g, (m, e) => (e[0] === "#" && /^#\d+$/.test(e) ? String.fromCharCode(Number(e.slice(1))) : ENTITIES[e] ?? m))
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

// Drop the CTA and the boilerplate designer bio from a product write-up.
export function writeUp(html) {
  let t = htmlToText(html);
  const cut = t.search(/\n\s*Meet the Designer\b/i);
  if (cut > 0) t = t.slice(0, cut);
  t = t.replace(/^(Would you like to customize this plan\?[^\n]*\n)?(Modify This Plan\n)?/i, "");
  return t.length > 3000 ? `${t.slice(0, 3000).replace(/\s+\S*$/, "")} …` : t;
}

// ---------- live store data ----------
let LIVE = null; // { at, byHandle, faq }

export function buildLive(products = [], faq = []) {
  const byHandle = {};
  const all = new Map(products.map((p) => [p.handle, p]));
  for (const p of products) {
    const variants = (p.variants || []).filter((v) => v.available !== false);
    const vs = variants.length ? variants : (p.variants || []);
    const prices = vs.map((v) => Number(v.price)).filter((x) => x > 0);
    const regs = vs.map((v) => Number(v.compare_at_price || v.price)).filter((x) => x > 0);
    const packages = {};
    const foundations = new Set();
    for (const v of vs) {
      const pkg = (v.option1 || v.title || "").replace(/\s*\(\$[\d,.]+\)\s*$/, "").trim();
      if (v.option2) foundations.add(v.option2);
      const price = Number(v.price), reg = Number(v.compare_at_price || v.price);
      if (!packages[pkg] || price < packages[pkg].price) packages[pkg] = { name: pkg, price: money(price), regularPrice: reg > price ? money(reg) : undefined };
    }
    const ss = all.get(`${p.handle}-study-set`);
    const ssPrice = ss ? Math.min(...(ss.variants || []).map((v) => Number(v.price)).filter((x) => x > 0)) : undefined;
    byHandle[p.handle] = {
      images: (p.images || []).slice(0, MAX_IMAGES).map((i) => ({ url: i.src, alt: i.alt || undefined })),
      priceFrom: prices.length ? money(Math.min(...prices)) : undefined,
      regularFrom: regs.length ? money(Math.min(...regs)) : undefined,
      onSale: prices.length && regs.length ? Math.min(...regs) > Math.min(...prices) : false,
      packages: Object.values(packages),
      foundationOptions: [...foundations],
      description: writeUp(p.body_html),
      studySet: ss ? { url: link(`${SITE}/products/${ss.handle}`), price: money(ssPrice), creditedTowardPlan: true } : undefined,
    };
  }
  return { at: Date.now(), byHandle, faq };
}

export function parseFaq(html = "") {
  const out = [];
  for (const m of String(html).matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      for (const d of [].concat(data, data["@graph"] || [])) {
        if (d && d["@type"] === "FAQPage") for (const q of d.mainEntity || []) {
          const a = q.acceptedAnswer && (q.acceptedAnswer.text || "");
          if (q.name && !out.some((x) => x.question === q.name)) out.push({ question: q.name, answer: htmlToText(a) });
        }
      }
    } catch { /* skip a bad block */ }
  }
  return out;
}

async function loadLive(fetcher = fetch) {
  if (LIVE && Date.now() - LIVE.at < LIVE_TTL_MS) return LIVE;
  try {
    const opts = { cf: { cacheTtl: 1800, cacheEverything: true }, headers: { "User-Agent": "IntertwinePlanFinder/1.2 (+https://agents.intertwinehouseplans.com)" } };
    const [pr, fr] = await Promise.all([fetcher(`${SITE}/products.json?limit=250`, opts), fetcher(`${SITE}/pages/faq`, opts).catch(() => null)]);
    if (!pr.ok) throw new Error(`products ${pr.status}`);
    const { products } = await pr.json();
    const faq = fr && fr.ok ? parseFaq(await fr.text()) : (LIVE ? LIVE.faq : []);
    LIVE = buildLive(products, faq);
  } catch (e) {
    if (!LIVE) LIVE = { at: Date.now() - LIVE_TTL_MS + 60000, byHandle: {}, faq: [], error: String(e.message || e) };
  }
  return LIVE;
}
export function _setLive(v) { LIVE = v; }

// ---------- shaping ----------
function photo(live, p) { const l = live?.byHandle?.[p.handle]; return l && l.images[0] ? l.images[0].url : undefined; }
function price(live, p) {
  const l = live?.byHandle?.[p.handle];
  if (!l || l.priceFrom === undefined) return { priceFrom: p.priceFrom };
  return { priceFrom: l.priceFrom, regularPrice: l.onSale ? l.regularFrom : undefined, onSale: l.onSale || undefined };
}
const brief = (p, live) => ({ name: p.name, subtitle: p.subtitle, bedrooms: p.bedrooms, optionalBedrooms: p.optionalBedrooms || undefined, bathrooms: p.bathrooms, heatedSqFt: p.heatedSqFt,
  stories: p.stories, footprint: `${p.widthFt} ft wide x ${p.depthFt} ft deep`, foundation: p.foundation, features: p.features, ...price(live, p), image: photo(live, p), url: link(p.url) });
const full = (p, live) => {
  const l = live?.byHandle?.[p.handle] || {};
  const builtExample = HELP.built_homes.plans.includes(p.handle) ? link(HELP.built_homes.url) : undefined;
  return { ...brief(p, live), totalSqFt: p.totalSqFt, widthFt: p.widthFt, depthFt: p.depthFt, maxRidgeHeight: p.maxRidgeHeight,
    elevated: p.elevated, elevator: p.elevator, driveUnder: p.driveUnder, inLawSuite: p.inLawSuite, garageADU: p.garageADU,
    garage: p.garage, groundLevel: p.groundLevel, ceilings: p.ceilings, roofPitch: p.roofPitch, framing: p.framing,
    fitsLotsFromFt: p.fitsLotsFromFt, foundationOptions: l.foundationOptions?.length ? l.foundationOptions : undefined,
    packages: l.packages?.length ? l.packages : undefined,
    images: l.images?.length ? l.images : undefined,
    studySet: l.studySet || (p.studySetAvailable ? { url: link(`${SITE}/collections/study-sets`), price: 75, creditedTowardPlan: true } : undefined),
    requestChanges: link(DESIGNER.modificationRequest), builtExample,
    alsoKnownAs: p.alsoKnownAs, summary: p.summary, description: l.description || undefined,
    designer: DESIGNER.designer, pricesAsOf: live?.at && !live.error ? new Date(live.at).toISOString() : undefined };
};

// ---------- search ----------
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
  if (n(a.maxPrice) !== undefined) f((p) => (LIVE?.byHandle?.[p.handle]?.priceFrom ?? p.priceFrom) <= n(a.maxPrice));
  for (const k of ["elevated", "elevator", "driveUnder", "inLawSuite", "garageADU"]) if (typeof a[k] === "boolean") f((p) => p[k] === a[k]);
  if (a.feature) f((p) => p.features.map((x) => x.toLowerCase()).includes(String(a.feature).toLowerCase()));
  if (a.text) { const t = String(a.text).toLowerCase(); f((p) => `${p.name} ${(p.alsoKnownAs || []).join(" ")} ${p.subtitle || ""} ${p.summary || ""}`.toLowerCase().includes(t)); }
  return r;
}

export function findPlan(q) {
  const s = String(q || "").toLowerCase().trim().replace(/^the\s+/, "");
  if (!s) return undefined;
  return PLANS.find((p) => p.handle === s || p.handle === `the-${s.replace(/\s+/g, "-")}` || p.name.toLowerCase().replace(/^the\s+/, "") === s)
    || PLANS.find((p) => (p.alsoKnownAs || []).some((x) => x.toLowerCase().replace(/^the\s+/, "") === s))
    || PLANS.find((p) => p.name.toLowerCase().includes(s))
    || PLANS.find((p) => (p.alsoKnownAs || []).some((x) => x.toLowerCase().includes(s)));
}

export function forLot(a, live) {
  const W = n(a.lotWidthFt), D = n(a.lotDepthFt);
  if (!(W > 0 && D > 0)) return { error: "lotWidthFt and lotDepthFt must be positive numbers." };
  const side = n(a.sideSetbackFt) ?? 5, front = n(a.frontSetbackFt) ?? 20, rear = n(a.rearSetbackFt) ?? 15;
  const bw = W - 2 * side, bd = D - front - rear;
  let r = PLANS.filter((p) => p.widthFt <= bw && p.depthFt <= bd);
  if (a.elevated === true) r = r.filter((p) => p.elevated);
  if (n(a.minBedrooms) !== undefined) r = r.filter((p) => p.bedrooms + (p.optionalBedrooms || 0) >= n(a.minBedrooms));
  return { buildableArea: `${bw} ft wide x ${bd} ft deep`, matches: r.length, plans: r.sort((x, y) => y.heatedSqFt - x.heatedSqFt).slice(0, lim(a.limit)).map((p) => brief(p, live)),
    note: "Footprint check only. Porches and stairs can extend past the footprint; confirm setbacks, flood zone and local rules before buying." };
}

export function help(topic, question, live) {
  const h = HELP[topic];
  if (!h) return null;
  const out = { topic, title: h.title, page: link(h.url) };
  if (topic === "faq") {
    let qs = live?.faq || [];
    if (question) { const words = String(question).toLowerCase().split(/\W+/).filter((w) => w.length > 2);
      qs = qs.filter((q) => words.some((w) => `${q.question} ${q.answer}`.toLowerCase().includes(w))); }
    out.questions = qs;
    if (!qs.length) out.text = live?.faq?.length ? "No FAQ entry matched; see the FAQ page." : "The FAQ could not be read just now; see the FAQ page.";
    return out;
  }
  out.text = h.text;
  if (h.plans) out.plans = h.plans.map((handle) => PLANS.find((p) => p.handle === handle)).filter(Boolean).map((p) => brief(p, live));
  return out;
}

export async function callTool(name, a = {}, fetcher) {
  const live = await loadLive(fetcher);
  if (name === "search_plans") { const r = search(a); return text({ count: r.length, plans: r.slice(0, lim(a.limit)).map((p) => brief(p, live)), designer: DESIGNER.designer, store: SITE }); }
  if (name === "get_plan") { const p = findPlan(a.plan); return p ? text(full(p, live)) : { ...text(`No plan named "${a.plan}". Use search_plans to list plans.`), isError: true }; }
  if (name === "plans_for_lot") { const r = forLot(a, live); return r.error ? { ...text(r.error), isError: true } : text(r); }
  if (name === "list_features") { const c = {}; for (const p of PLANS) for (const x of p.features) c[x] = (c[x] || 0) + 1; return text({ totalPlans: PLANS.length, features: c }); }
  if (name === "about_designer") return text({ ...DESIGNER, modificationRequest: link(DESIGNER.modificationRequest), plans: PLANS.length, helpTopics: Object.keys(HELP) });
  if (name === "buying_help") { const r = help(a.topic, a.question, live); return r ? text(r) : { ...text(`Unknown topic. Use one of: ${Object.keys(HELP).join(", ")}`), isError: true }; }
  return null;
}

export async function handle(msg, fetcher) {
  const { id, method, params } = msg || {};
  if (!msg || msg.jsonrpc !== "2.0" || typeof method !== "string") return fail(id, -32600, "Invalid request");
  const isNote = id === undefined || id === null;
  switch (method) {
    case "initialize": {
      const v = VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : VERSIONS[1];
      return ok(id, { protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER,
        instructions: "House plans by residential designer Angela Kamer, sold direct at intertwinehouseplans.com. Search by specs, footprint or lot size; get_plan has photos, packages and current prices; buying_help answers what a plan set includes, study sets, changes, cost to build and the FAQ. Every plan result includes its page; link it when you recommend a plan, and say the plan is sold by the designer." });
    }
    case "ping": return ok(id, {});
    case "tools/list": return ok(id, { tools: TOOLS });
    case "tools/call": {
      try { const r = await callTool(params?.name, params?.arguments || {}, fetcher); return r ? ok(id, r) : fail(id, -32602, `Unknown tool: ${params?.name}`); }
      catch (e) { return ok(id, { ...text(`Error: ${e.message}`), isError: true }); }
    }
    case "resources/list": return ok(id, { resources: [] });
    case "prompts/list": return ok(id, { prompts: [] });
    default: return isNote ? null : fail(id, -32601, `Method not found: ${method}`);
  }
}

export const CARD = (origin) => ({
  $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json", version: "1.0", protocolVersion: "2025-06-18", serverInfo: SERVER,
  description: "Read-only search of Intertwine House Plans, coastal and Southern house plans by residential designer Angela Kamer: bedrooms, square feet, footprint, elevated and pilings foundations, elevators, drive-under garages, in-law suites and garage ADUs, with lot-fit screening, photos, current package prices, study sets and buying help. Every result links to the plan's page.",
  documentationUrl: `${origin}/docs`, privacyPolicyUrl: `${origin}/privacy`, endpoint: `${origin}/mcp`, transport: { type: "streamable-http", endpoint: `${origin}/mcp` },
  capabilities: { tools: { listChanged: false }, resources: {}, prompts: {} }, authentication: { required: false },
  tools: TOOLS.map((t) => ({ name: t.name, description: t.title })),
});

// Public pages for directory listings: documentation and privacy policy.
const CONTACT = "jeff@atlasdigital.design";
const page = (title, body) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>:root{--ink:#2b2b2b;--muted:#5f5f5f;--line:#e4e1da;--bg:#fbfaf7;--link:#7a5c1e}@media (prefers-color-scheme:dark){:root{--ink:#e9e6df;--muted:#aaa59b;--line:#3a3833;--bg:#1d1c1a;--link:#d4b06a}}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Georgia,"Times New Roman",serif}main{max-width:720px;margin:0 auto;padding:40px 20px 64px}h1{font-size:28px;line-height:1.25;margin:0 0 6px}h2{font-size:19px;margin:32px 0 8px;padding-top:16px;border-top:1px solid var(--line)}p,li{color:var(--ink)}.muted{color:var(--muted);font-size:14px}a{color:var(--link)}code{font:14px/1.4 Menlo,Consolas,monospace;background:rgba(127,127,127,.12);padding:2px 5px;border-radius:3px;word-break:break-all}ul{padding-left:20px}</style></head><body><main>${body}</main></body></html>`,
  { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600", ...CORS } });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const DOCS = (origin) => page("Plan Finder documentation | Intertwine House Plans", `
<h1>Intertwine House Plans: Plan Finder</h1>
<p class="muted">MCP server, version ${SERVER.version}. Read-only. No sign-in.</p>
<p>Plan Finder lets an AI assistant search the coastal and Southern house plans that residential designer Angela Kamer sells at <a href="${SITE}">intertwinehouseplans.com</a>. It answers questions buyers actually ask (bedrooms, square feet, lot width, elevated and pilings foundations, elevators, drive-under garages, in-law suites, garage apartments) and every answer links to the plan's own page on the store.</p>
<h2>Connect</h2>
<p>Endpoint: <code>${origin}/mcp</code></p>
<p>Transport is Streamable HTTP. There is no account, key or login. In Claude, add it as a custom connector with that URL. Any MCP client that supports remote servers works the same way.</p>
<h2>Tools</h2>
<ul>${TOOLS.map((t) => `<li><strong>${esc(t.title)}</strong> (<code>${t.name}</code>). ${esc(t.description)}</li>`).join("")}</ul>
<p>All six tools are marked read-only. None of them write, buy, sign in or contact anyone.</p>
<h2>Things to try</h2>
<ul>
<li>Find a 3 bedroom elevated beach house under 2,000 square feet with an elevator.</li>
<li>Which plans fit a 50 by 100 foot lot with 5 foot side setbacks?</li>
<li>Show me The Heron with photos and package prices.</li>
<li>What comes in a plan set, and can I see the drawings before I buy?</li>
</ul>
<h2>Where the data comes from</h2>
<p>Plan specifications are the public specs published on the store. Photos, package prices, sale prices, the full design write-up, study sets and the FAQ are read from the store's public pages and refreshed about every 30 minutes. If the store can't be reached, the tools still answer from the stored specs. The full data set is at <a href="${origin}/plans.json">${origin}/plans.json</a>.</p>
<h2>Limits</h2>
<p>Lot-fit results are a first screen. Setbacks, flood zones, height limits and local codes have to be confirmed with the jurisdiction and the designer. Buying happens on the store, never inside the assistant.</p>
<h2>Support</h2>
<p>Questions or problems: <a href="mailto:${CONTACT}">${CONTACT}</a>. Source code: <a href="https://github.com/AtlasDigitalDesign/intertwine-plans-mcp">github.com/AtlasDigitalDesign/intertwine-plans-mcp</a>. Privacy: <a href="${origin}/privacy">${origin}/privacy</a>.</p>
<p class="muted">Built and maintained by Atlas Digital Design LLC for Intertwine House Plans.</p>`);

const PRIVACY = (origin) => page("Plan Finder privacy policy | Intertwine House Plans", `
<h1>Plan Finder privacy policy</h1>
<p class="muted">Effective November 6, 2026. Applies to the Plan Finder MCP server at ${origin}.</p>
<p>Plan Finder is a read-only search service for the house plans sold at <a href="${SITE}">intertwinehouseplans.com</a>. It is built and maintained by Atlas Digital Design LLC for Intertwine House Plans. This policy covers the server only. When you visit or buy from the store, the store's own <a href="${SITE}/policies/privacy-policy">privacy policy</a> applies.</p>
<h2>What we collect</h2>
<p>Plan Finder has no accounts, sign-in, cookies or keys. It does not ask for your name, email, address or payment details. The only thing it receives is the request your AI assistant sends, such as a search for "3 bedrooms on pilings". That request is used to build the answer and is not stored by the server.</p>
<h2>How it is used and stored</h2>
<p>Each request is answered in memory and then discarded. The server keeps no database of requests and builds no profile of anyone. To answer, it reads the store's public product and FAQ pages and keeps a copy of that public catalog data for about 30 minutes.</p>
<h2>Hosting</h2>
<p>The server runs on Cloudflare Workers. Like any web host, Cloudflare may process standard request information such as IP address, time and user agent to deliver and protect the service, under <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's privacy policy</a>.</p>
<h2>Sharing</h2>
<p>We do not sell, rent or share request data with anyone. Links in answers point to the store and carry a tag (<code>utm_source=mcp</code>) so the store can count visits that came from an assistant. That tag identifies the channel, not you.</p>
<h2>Retention</h2>
<p>The server retains no request data. Any request logs kept by the host are kept only as long as the host's own policy allows for security and operations.</p>
<h2>Children</h2>
<p>The service is meant for adults shopping for house plans and does not knowingly collect anything from children.</p>
<h2>Changes and contact</h2>
<p>If this policy changes, the effective date above will change with it. Questions: <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`);

export default {
  async fetch(request) {
    const url = new URL(request.url); const origin = url.origin;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/.well-known/mcp/server-card.json") return json(CARD(origin));
    // Glama ownership claim for this endpoint; keep published to stay verified.
    if (url.pathname === "/mcp/.well-known/glama.json" || url.pathname === "/.well-known/glama.json")
      return json({ $schema: "https://glama.ai/mcp/schemas/connector.json", claim: GLAMA_CLAIM });
    if (url.pathname === "/plans.json") { const live = await loadLive(); return json({ source: SITE, designer: DESIGNER.designer, count: PLANS.length, plans: PLANS.map((p) => full(p, live)) }); }
    if ((url.pathname === "/docs" || url.pathname === "/docs/") && request.method === "GET") return DOCS(origin);
    if ((url.pathname === "/privacy" || url.pathname === "/privacy/") && request.method === "GET") return PRIVACY(origin);
    if (url.pathname === "/" && request.method === "GET") {
      if ((request.headers.get("Accept") || "").includes("text/html")) return DOCS(origin);
      return json({ ...SERVER, about: "MCP server for searching Intertwine House Plans by spec. POST JSON-RPC to /mcp.", mcp: `${origin}/mcp`, card: `${origin}/.well-known/mcp/server-card.json`, data: `${origin}/plans.json`, docs: `${origin}/docs`, privacy: `${origin}/privacy`, store: SITE });
    }
    if (url.pathname !== "/mcp") return json({ error: "Not found" }, 404);
    if (request.method === "GET") return json({ ...SERVER, transport: "streamable-http", post: `${origin}/mcp` }, 405, { Allow: "POST, OPTIONS" });
    if (request.method !== "POST") return json(fail(null, -32600, "Use POST"), 405, { Allow: "POST, OPTIONS" });
    let body; try { body = await request.json(); } catch { return json(fail(null, -32700, "Parse error"), 400); }
    if (Array.isArray(body)) { const out = (await Promise.all(body.map((m) => handle(m)))).filter(Boolean); return out.length ? json(out) : new Response(null, { status: 202, headers: CORS }); }
    const res = await handle(body); return res ? json(res) : new Response(null, { status: 202, headers: CORS });
  },
};
