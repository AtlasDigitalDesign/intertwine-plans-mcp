// Intertwine House Plans: Plan Finder, a read-only MCP server (Streamable HTTP, stateless).
// Lets AI assistants search Angela Kamer's house plans by the specs buyers ask about,
// and always answers with the plan's own page on intertwinehouseplans.com.
// No accounts, no keys, nothing written.
// Specs are baked in (plans.json). Photos, package prices, sale prices, the full write-up,
// study sets and the FAQ are read live from the store's public pages, cached for 30 minutes.
// If the store can't be reached, every tool still answers from the baked specs.
import PLANS from "./plans.json" with { type: "json" };
import OPENAPI from "../openapi.json" with { type: "json" };

const SITE = "https://intertwinehouseplans.com";
const SERVER = { name: "intertwine-house-plans", title: "Intertwine House Plans: Plan Finder", version: "1.2.1" };
const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version", "Access-Control-Expose-Headers": "Mcp-Session-Id" };
const UTM = "utm_source=mcp&utm_medium=agent&utm_campaign=plan_finder";
const LIVE_TTL_MS = 30 * 60 * 1000;
const MAX_IMAGES = 8;
const ICON_PNG = "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";
const INDEXNOW_KEY = "1bbbc00c3b0cf2cdf00c266ab54c3695";
// OpenAI plugin domain check: paste the token from platform.openai.com/plugins here, then deploy.
const OPENAI_APPS_CHALLENGE = "";
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

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const TOOLS = [
  { name: "search_plans", title: "Search house plans",
    description: "Find house plans in the Intertwine House Plans catalog (68 plan sets by residential designer Angela Kamer) that match a buyer's requirements. Use this first when someone describes the house they want: bedrooms, baths, size, width, an elevated or pilings foundation, an elevator, a drive-under garage, an in-law suite, a garage apartment, a style or a budget. All filters are optional and combine with AND; leave out any the buyer didn't mention. Returns { count, plans[] } where count is the total number of matches and plans holds up to `limit` of them in catalog order, each with name, subtitle, bedrooms (and optional bedrooms), baths, heated sq ft, stories, footprint, foundation, features, starting price (plus the regular price when a sale is on), one photo URL and the plan's page URL. Use get_plan for everything about one plan, plans_for_lot when the buyer gives lot dimensions, and list_features to see which style and feature values exist. Read-only; it never buys or changes anything.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      minBedrooms: { type: "number", minimum: 0, description: "Fewest bedrooms. Counts optional bedrooms, so a 3-bedroom plan with an optional 4th matches minBedrooms 4." },
      maxBedrooms: { type: "number", minimum: 0, description: "Most bedrooms, counting only standard bedrooms." },
      minBathrooms: { type: "number", minimum: 0, description: "Fewest bathrooms; half baths count as 0.5 (for example 2.5)." },
      minSqFt: { type: "number", minimum: 0, description: "Smallest heated (living) area in square feet. Garages, porches and ground-level storage aren't included." },
      maxSqFt: { type: "number", minimum: 0, description: "Largest heated (living) area in square feet." },
      stories: { type: "integer", minimum: 1, maximum: 3, description: "Exact number of stories as the plan lists them (the catalog has 1- and 2-story plans)." },
      maxWidthFt: { type: "number", minimum: 0, description: "Widest the house footprint can be, in feet. For a full lot check with setbacks, use plans_for_lot instead." },
      maxDepthFt: { type: "number", minimum: 0, description: "Deepest the house footprint can be, in feet." },
      elevated: { type: "boolean", description: "true for plans built on a raised foundation (pilings, piers or an elevated base) for flood zones and coastal lots; false for plans that are not raised." },
      elevator: { type: "boolean", description: "true for plans with an elevator." },
      driveUnder: { type: "boolean", description: "true for plans with a drive-under garage beneath the living floors." },
      inLawSuite: { type: "boolean", description: "true for plans with a bedroom and full bath set apart for a guest or relative." },
      garageADU: { type: "boolean", description: "true for detached garage plans that include an apartment or ADU above or beside the garage." },
      feature: { type: "string", enum: FEATURES, description: "One style or feature to filter by, case-insensitive. Use pilings and stilts or elevated coastal for raised coastal homes. list_features shows how many plans carry each value." },
      text: { type: "string", description: "Words to find in a plan's name, other published names, subtitle or summary, for example porch, courtyard or Lambert's Cottage. Case-insensitive substring match." },
      maxPrice: { type: "number", minimum: 0, description: "Highest starting price in US dollars, using the current price (sale price when a sale is on)." },
      limit: { type: "integer", minimum: 1, maximum: 25, default: 10, description: "How many plans to return (1 to 25). count still reports every match." } } },
    annotations: { title: "Search house plans", ...RO } },
  { name: "get_plan", title: "Get one plan",
    description: "Get the complete record for one house plan. Use this after search_plans or plans_for_lot, or when the buyer names a plan. Accepts the plan's name, any other name it is published under, or its URL handle (for example The Heron, Lambert's Cottage or the-heron); matching is case-insensitive, ignores a leading \"The\" and falls back to a partial name match. Returns specs (bedrooms, baths, heated and total sq ft, stories, width, depth, max ridge height, ceilings, roof pitch, framing, garage, ground level), yes/no flags for elevated, elevator, drive-under, in-law suite and garage ADU, the narrowest lot it suits, foundation options with any added fee, every package (PDF, PDF plus CAD, Chief Architect) with current and regular price, image URLs, the full design write-up, the $75 study set link, the change request link, a built-home link when one exists, other published names and the plan page URL. If no plan matches, it returns an error that says to use search_plans. Read-only.",
    inputSchema: { type: "object", additionalProperties: false, properties: { plan: { type: "string", minLength: 1, description: "Plan name, other published name, or URL handle, for example \"The Heron\", \"Lambert's Cottage\" or \"the-heron\"." } }, required: ["plan"] },
    annotations: { title: "Get one plan", ...RO } },
  { name: "plans_for_lot", title: "Plans that fit a lot",
    description: "Find the plans whose house footprint fits a specific lot. Use this when the buyer gives lot width and depth; use search_plans when they only describe the house. Subtracts the setbacks from the lot (side setback from each side, plus front and rear), then returns { buildableArea, matches, plans[], note }: the buildable rectangle, the number of plans that fit, up to `limit` of them largest first with the same fields as search_plans, and a reminder that porches and stairs can extend past the footprint. This is a first screen only. Setbacks, flood zone, height limits and local codes must be confirmed with the jurisdiction and the designer. Read-only.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      lotWidthFt: { type: "number", exclusiveMinimum: 0, description: "Lot width along the street, in feet." },
      lotDepthFt: { type: "number", exclusiveMinimum: 0, description: "Lot depth from street to rear line, in feet." },
      sideSetbackFt: { type: "number", minimum: 0, default: 5, description: "Required setback on each side, in feet. Defaults to 5 if the buyer doesn't know." },
      frontSetbackFt: { type: "number", minimum: 0, default: 20, description: "Required front setback, in feet. Defaults to 20." },
      rearSetbackFt: { type: "number", minimum: 0, default: 15, description: "Required rear setback, in feet. Defaults to 15." },
      elevated: { type: "boolean", description: "true to return only raised-foundation plans (pilings, piers or elevated CMU)." },
      minBedrooms: { type: "number", minimum: 0, description: "Fewest bedrooms, counting optional bedrooms." },
      limit: { type: "integer", minimum: 1, maximum: 25, default: 10, description: "How many fitting plans to return (1 to 25), largest heated area first." } },
      required: ["lotWidthFt", "lotDepthFt"] },
    annotations: { title: "Plans that fit a lot", ...RO } },
  { name: "list_features", title: "List styles and features",
    description: "List every style and feature value the catalog uses, with how many plans carry each. Takes no arguments. Returns { totalPlans, features } where features maps each value (for example \"elevated coastal\": 39, \"elevator\": 21) to its count across all 68 plan sets; a plan can carry several. Use this to see what the catalog offers before searching, or to pick a valid `feature` value for search_plans. It returns counts only; use search_plans to get the plans themselves. Read-only.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} },
    annotations: { title: "List styles and features", ...RO } },
  { name: "about_designer", title: "About the designer",
    description: "Get background on the designer and how buying from her works. Takes no arguments. Returns a fixed summary: designer (Angela Kamer, residential designer), background (training and coastal experience), what the store sells, plan set formats, how $75 study sets work and are credited, how modifications are quoted, the modification request link, the number of plans and the list of buying_help topics. Use this when the buyer asks who drew the plans or how ordering works in general; use buying_help for a specific pre-purchase question and get_plan for a specific plan. Read-only.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} },
    annotations: { title: "About the designer", ...RO } },
  { name: "buying_help", title: "Buying help",
    description: "Answer a buyer's question before purchase using the store's own help pages. Pick one topic: whats_included (what a plan set contains and doesn't), study_sets (the $75 preview set and its credit), modifications (how changes are quoted and requested), cost_to_build (why there is no calculator and how to get a real number), built_homes (plans that have been built, with photos) or faq (the store's live FAQ). For faq, pass `question` to return only entries whose question or answer contains one of its words. Returns { topic, title, page } with the answer text; faq adds questions[] (question and answer pairs) and built_homes adds plans[] in search_plans form. Use get_plan for questions about one plan's specs or price. Read-only.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      topic: { type: "string", enum: Object.keys(HELP), description: "Which help topic to return; see the description for what each covers." },
      question: { type: "string", description: "Only used with topic faq: words to match against FAQ questions, for example license, permit or engineer." } }, required: ["topic"] },
    annotations: { title: "Buying help", ...RO } },
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
const page = (title, body) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" type="image/png" href="/icon.png"><title>${title}</title><style>:root{--ink:#2b2b2b;--muted:#5f5f5f;--line:#e4e1da;--bg:#fbfaf7;--link:#7a5c1e}@media (prefers-color-scheme:dark){:root{--ink:#e9e6df;--muted:#aaa59b;--line:#3a3833;--bg:#1d1c1a;--link:#d4b06a}}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Georgia,"Times New Roman",serif}main{max-width:720px;margin:0 auto;padding:40px 20px 64px}h1{font-size:28px;line-height:1.25;margin:0 0 6px}h2{font-size:19px;margin:32px 0 8px;padding-top:16px;border-top:1px solid var(--line)}p,li{color:var(--ink)}.muted{color:var(--muted);font-size:14px}a{color:var(--link)}code{font:14px/1.4 Menlo,Consolas,monospace;background:rgba(127,127,127,.12);padding:2px 5px;border-radius:3px;word-break:break-all}ul{padding-left:20px}</style></head><body><main>${body}</main></body></html>`,
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
<h2>Plain HTTP, no MCP client</h2>
<p>The same catalog is one GET away at <code>${origin}/plans.json</code>: every plan with specs, photos, packages and current prices. An OpenAPI 3.0 description of that endpoint, the server card and <code>/mcp</code> is at <code>${origin}/openapi.json</code>.</p>
<h2>Where the data comes from</h2>
<p>Plan specifications are the public specs published on the store. Photos, package prices, sale prices, the full design write-up, study sets and the FAQ are read from the store's public pages and refreshed about every 30 minutes. If the store can't be reached, the tools still answer from the stored specs. The full data set is at <a href="${origin}/plans.json">${origin}/plans.json</a>.</p>
<h2>Limits</h2>
<p>Lot-fit results are a first screen. Setbacks, flood zones, height limits and local codes have to be confirmed with the jurisdiction and the designer. Buying happens on the store, never inside the assistant.</p>
<h2>Support</h2>
<p>Questions or problems: <a href="mailto:${CONTACT}">${CONTACT}</a>. Source code: <a href="https://github.com/AtlasDigitalDesign/intertwine-plans-mcp">github.com/AtlasDigitalDesign/intertwine-plans-mcp</a>. Privacy: <a href="${origin}/privacy">${origin}/privacy</a>. Terms: <a href="${origin}/terms">${origin}/terms</a>.</p>
<p class="muted">Built and maintained by Atlas Digital Design LLC for Intertwine House Plans.</p>`);

const PRIVACY = (origin) => page("Plan Finder privacy policy | Intertwine House Plans", `
<h1>Plan Finder privacy policy</h1>
<p class="muted">Effective November 7, 2026. Applies to the Plan Finder MCP server at ${origin}.</p>
<p>Plan Finder is a read-only search service for the house plans sold at <a href="${SITE}">intertwinehouseplans.com</a>. It is built and maintained by Atlas Digital Design LLC for Intertwine House Plans. This policy covers the server only. When you visit or buy from the store, the store's own <a href="${SITE}/policies/privacy-policy">privacy policy</a> applies.</p>
<h2>What we collect</h2>
<p>Plan Finder has no accounts, sign-in, cookies or keys. It does not ask for your name, email, address or payment details. The only thing it receives is the request your AI assistant sends, such as a search for "3 bedrooms on pilings". That request is used to build the answer. The server keeps anonymous usage counts, described below, and nothing that identifies you.</p>
<h2>How it is used and stored</h2>
<p>Each request is answered in memory. For each tool call the server records an anonymous count: which tool was used, the structured filters it was given (for example bedrooms, lot width or a feature such as elevator), which plans came back, and the general kind of assistant that asked (for example ChatGPT or Claude, read from the user agent of the request). It does not record free-text words typed into a search or question, IP addresses, or anything else about the person. The counts show which plans and features assistants ask about, and are kept for up to three months. The server builds no profile of anyone. To answer, it reads the store's public product and FAQ pages and keeps a copy of that public catalog data for about 30 minutes.</p>
<h2>Hosting</h2>
<p>The server runs on Cloudflare Workers. Like any web host, Cloudflare may process standard request information such as IP address, time and user agent to deliver and protect the service, under <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's privacy policy</a>.</p>
<h2>Sharing</h2>
<p>We do not sell, rent or share request data with anyone. Links in answers point to the store and carry a tag (<code>utm_source=mcp</code>) so the store can count visits that came from an assistant. That tag identifies the channel, not you.</p>
<h2>Retention</h2>
<p>Anonymous usage counts are kept for up to three months. No other request data is retained by the server. Any request logs kept by the host are kept only as long as the host's own policy allows for security and operations.</p>
<h2>Children</h2>
<p>The service is meant for adults shopping for house plans and does not knowingly collect anything from children.</p>
<h2>Changes and contact</h2>
<p>If this policy changes, the effective date above will change with it. Questions: <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`);


const TERMS = (origin) => page("Plan Finder terms of service | Intertwine House Plans", `
<h1>Plan Finder terms of service</h1>
<p class="muted">Effective November 7, 2026. Applies to the Plan Finder MCP server at ${origin}.</p>
<p>Plan Finder is a free, read-only search service for the house plans sold at <a href="${SITE}">intertwinehouseplans.com</a>. It is built and maintained by Atlas Digital Design LLC for Intertwine House Plans. By connecting to it or using answers it returns, you agree to these terms.</p>
<h2>What the service does</h2>
<p>Plan Finder returns public information about the plans in the store: specifications, photos, package prices, study sets and answers from the store's help pages. It does not sell anything, take payments, create accounts or change any data. Every purchase happens on the store, under the store's own <a href="${SITE}/policies/terms-of-service">terms of service</a>.</p>
<h2>Accuracy</h2>
<p>We keep the data current, and prices and photos are refreshed from the store about every 30 minutes. Even so, the plan page on the store is the final word on a plan's details, price and availability. If an answer and the plan page disagree, the plan page wins.</p>
<h2>Lot fit and building decisions</h2>
<p>Lot-fit results compare a plan's footprint with the lot size and setbacks you give. They are a first screen only. Setbacks, flood zones, height limits, engineering and local codes must be confirmed with your jurisdiction, a licensed professional and the designer before you buy or build. Nothing the service returns is engineering, legal or construction advice.</p>
<h2>Plans and copyright</h2>
<p>The house plans, drawings, photos and descriptions belong to their designer and are protected by copyright. Using the service gives you no license to build from or reproduce a plan. A license comes only with a purchase on the store.</p>
<h2>Fair use of the service</h2>
<p>Please don't overload the service, try to break it, or use it to copy the catalog in bulk for another site. We may limit or block traffic that does.</p>
<h2>No warranty</h2>
<p>The service is provided as is, without warranties of any kind. To the extent the law allows, Atlas Digital Design LLC and Intertwine House Plans are not liable for losses arising from use of the service. The service may change or stop at any time.</p>
<h2>Contact</h2>
<p>Questions about these terms: <a href="mailto:${CONTACT}">${CONTACT}</a>. Privacy: <a href="${origin}/privacy">${origin}/privacy</a>.</p>`);

const SUPPORT = (origin) => page("Plan Finder support | Intertwine House Plans", `
<h1>Plan Finder support</h1>
<p>For help with the Plan Finder connector, a wrong or missing answer, or anything that isn't working, email <a href="mailto:${CONTACT}">${CONTACT}</a>. Most messages get an answer within one business day.</p>
<h2>Questions about a plan or an order</h2>
<p>For questions about a specific plan, a modification, or an order you've placed, contact the designer through the store: <a href="${SITE}/pages/contact">intertwinehouseplans.com/pages/contact</a>. Modification quotes are free: <a href="${SITE}/pages/modification-request">request one here</a>.</p>
<h2>More</h2>
<p><a href="${origin}/docs">How Plan Finder works</a> · <a href="${origin}/privacy">Privacy</a> · <a href="${origin}/terms">Terms</a></p>`);

// ---------- anonymous usage counts ----------
// One data point per tool call in Cloudflare Analytics Engine (binding USAGE). Records the tool, the structured
// filters (numbers, yes/no, feature, topic, plan name), which plans came back, and the assistant family from the
// User-Agent. Never records free-text fields (text, question), IP addresses or anything else about the person.
const FREE_TEXT = new Set(["text", "question"]);
function family(ua = "") {
  const u = ua.toLowerCase();
  if (/openai|chatgpt|gpt/.test(u)) return "openai";
  if (/claude|anthropic/.test(u)) return "anthropic";
  if (/perplexity/.test(u)) return "perplexity";
  if (/gemini|google/.test(u)) return "google";
  if (/microsoft|copilot|bing/.test(u)) return "microsoft";
  if (/glama|smithery|inspector|lobehub|pulsemcp|registry/.test(u)) return "directory";
  if (/curl|python|node|axios|go-http|undici|okhttp/.test(u)) return "script";
  return ua ? "other" : "none";
}
export function usagePoint(msg, res, ua) {
  if (msg?.method !== "tools/call") return null;
  const name = String(msg.params?.name || "unknown").slice(0, 40);
  const args = msg.params?.arguments || {};
  const filters = Object.entries(args).filter(([k, v]) => !FREE_TEXT.has(k) && v !== undefined && v !== null && typeof v !== "object")
    .map(([k, v]) => `${k}=${String(v).slice(0, 40)}`).sort().join(";").slice(0, 400);
  const usedText = Object.keys(args).some((k) => FREE_TEXT.has(k) && args[k]);
  let plans = [], count = 0, error = 0;
  try {
    error = res?.error || res?.result?.isError ? 1 : 0;
    const body = JSON.parse(res?.result?.content?.[0]?.text || "{}");
    const list = body.plans || (body.name ? [body] : []);
    plans = list.map((x) => x.name).filter(Boolean).slice(0, 10);
    count = body.count ?? body.matches ?? plans.length;
  } catch { /* text answer, nothing to parse */ }
  return { indexes: [name], blobs: [name, filters, plans.join("|").slice(0, 500), family(ua), usedText ? "text" : ""], doubles: [Number(count) || 0, error] };
}
function record(env, ctx, msgs, results, ua) {
  if (!env?.USAGE) return;
  msgs.forEach((m, i) => {
    const pt = usagePoint(m, results[i], ua);
    if (pt) try { env.USAGE.writeDataPoint(pt); } catch { /* counting never breaks an answer */ }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url); const origin = url.origin;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/.well-known/mcp/server-card.json") return json(CARD(origin));
    // OpenAPI description of /plans.json, the server card and /mcp, for API directories (APIs.guru).
    if (url.pathname === "/openapi.json") return json(OPENAPI);
    // Glama ownership claim for this endpoint; keep published to stay verified.
    if (url.pathname === "/mcp/.well-known/glama.json" || url.pathname === "/.well-known/glama.json")
      return json({ $schema: "https://glama.ai/mcp/schemas/connector.json", claim: GLAMA_CLAIM });
    if (url.pathname === "/plans.json") { const live = await loadLive(); return json({ source: SITE, designer: DESIGNER.designer, count: PLANS.length, plans: PLANS.map((p) => full(p, live)) }); }
    if (url.pathname === "/.well-known/openai-apps-challenge" && OPENAI_APPS_CHALLENGE)
      return new Response(OPENAI_APPS_CHALLENGE, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    if (url.pathname === `/${INDEXNOW_KEY}.txt`) return new Response(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    if (url.pathname === "/sitemap.xml") {
      const urls = ["/docs", "/privacy", "/terms", "/support"].map((p) => `<url><loc>${origin}${p}</loc><lastmod>2026-11-07</lastmod></url>`).join("");
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
    }
    if (url.pathname === "/favicon.ico" || url.pathname === "/icon.png" || url.pathname === "/favicon.png")
      return new Response(Uint8Array.from(atob(ICON_PNG), (c) => c.charCodeAt(0)), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", ...CORS } });
    if ((url.pathname === "/docs" || url.pathname === "/docs/") && request.method === "GET") return DOCS(origin);
    if ((url.pathname === "/privacy" || url.pathname === "/privacy/") && request.method === "GET") return PRIVACY(origin);
    if ((url.pathname === "/terms" || url.pathname === "/terms/") && request.method === "GET") return TERMS(origin);
    if ((url.pathname === "/support" || url.pathname === "/support/") && request.method === "GET") return SUPPORT(origin);
    if (url.pathname === "/" && request.method === "GET") {
      if ((request.headers.get("Accept") || "").includes("text/html")) return DOCS(origin);
      return json({ ...SERVER, about: "MCP server for searching Intertwine House Plans by spec. POST JSON-RPC to /mcp.", mcp: `${origin}/mcp`, card: `${origin}/.well-known/mcp/server-card.json`, data: `${origin}/plans.json`, openapi: `${origin}/openapi.json`, docs: `${origin}/docs`, privacy: `${origin}/privacy`, store: SITE });
    }
    if (url.pathname !== "/mcp") return json({ error: "Not found" }, 404);
    if (request.method === "GET") return json({ ...SERVER, transport: "streamable-http", post: `${origin}/mcp` }, 405, { Allow: "POST, OPTIONS" });
    if (request.method !== "POST") return json(fail(null, -32600, "Use POST"), 405, { Allow: "POST, OPTIONS" });
    let body; try { body = await request.json(); } catch { return json(fail(null, -32700, "Parse error"), 400); }
    const ua = request.headers.get("User-Agent") || "";
    if (Array.isArray(body)) { const all = await Promise.all(body.map((m) => handle(m))); record(env, ctx, body, all, ua); const out = all.filter(Boolean); return out.length ? json(out) : new Response(null, { status: 202, headers: CORS }); }
    const res = await handle(body); record(env, ctx, [body], [res], ua); return res ? json(res) : new Response(null, { status: 202, headers: CORS });
  },
};
