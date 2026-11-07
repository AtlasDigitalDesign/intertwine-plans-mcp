import assert from "node:assert/strict";
import worker, { search, findPlan, callTool, buildLive, parseFaq, writeUp, _setLive } from "./src/worker.js";

const heronHtml = `<h2><strong>The Heron House Plan</strong></h2><p>The Heron is a traditional Low Country house &amp; more.</p><h2>Key Design Features</h2><p><strong>A main-floor primary suite:</strong> one level.</p><h2>Meet the Designer</h2><p>Every blueprint is crafted by Angela</p>`;
const products = [
  { handle: "the-heron", body_html: heronHtml, images: [{ src: "https://cdn.shopify.com/heron-front.jpg", alt: "Heron front" }, { src: "https://cdn.shopify.com/heron-plan.png", alt: null }],
    variants: [
      { title: "PDF Files ($1845) / Pier", option1: "PDF Files ($1845)", option2: "Pier", price: "1752.95", compare_at_price: "1845.00", available: true },
      { title: "PDF Files ($1845) / Slab (+$250)", option1: "PDF Files ($1845)", option2: "Slab (+$250)", price: "2002.95", compare_at_price: "2095.00", available: true },
      { title: "Chief Architect Files ($3790) / Pier", option1: "Chief Architect Files ($3790)", option2: "Pier", price: "3600.95", compare_at_price: "3790.00", available: true } ] },
  { handle: "the-heron-study-set", body_html: "", images: [], variants: [{ title: "Default", price: "75.00", compare_at_price: null }] },
];
const faqHtml = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Do I get a license to build?","acceptedAnswer":{"@type":"Answer","text":"<p>Yes, one build per purchase.</p>"}},{"@type":"Question","name":"Can I change a plan?","acceptedAnswer":{"@type":"Answer","text":"Yes, quotes are free."}}]}</script>`;

// pure parts
assert.equal(writeUp(heronHtml).includes("Meet the Designer"), false);
assert.ok(writeUp(heronHtml).includes("Low Country house & more"));
const faq = parseFaq(faqHtml); assert.equal(faq.length, 2); assert.equal(faq[0].answer, "Yes, one build per purchase.");
const live = buildLive(products, faq);
const h = live.byHandle["the-heron"];
assert.equal(h.priceFrom, 1752.95); assert.equal(h.regularFrom, 1845); assert.equal(h.onSale, true);
assert.deepEqual(h.packages.map((p) => p.name), ["PDF Files", "Chief Architect Files"]);
assert.equal(h.packages[0].price, 1752.95); assert.equal(h.packages[0].regularPrice, 1845);
assert.deepEqual(h.foundationOptions, ["Pier", "Slab (+$250)"]);
assert.equal(h.studySet.price, 75); assert.ok(h.studySet.url.includes("the-heron-study-set"));

// tools with live data
const fakeFetch = async (url) => url.includes("products.json")
  ? new Response(JSON.stringify({ products }), { status: 200 })
  : new Response(faqHtml, { status: 200 });
_setLive(null);
const call = async (name, args) => JSON.parse((await callTool(name, args, fakeFetch)).content[0].text);
const heron = await call("get_plan", { plan: "Lambert's Cottage" });
assert.equal(heron.name, "The Heron"); assert.equal(heron.priceFrom, 1752.95); assert.equal(heron.regularPrice, 1845); assert.equal(heron.onSale, true);
assert.equal(heron.images[0].url, "https://cdn.shopify.com/heron-front.jpg"); assert.equal(heron.image, "https://cdn.shopify.com/heron-front.jpg");
assert.equal(heron.garage, "2-car drive-under"); assert.equal(heron.fitsLotsFromFt, 50); assert.ok(heron.ceilings);
assert.ok(heron.description.includes("Key Design Features")); assert.ok(heron.requestChanges.includes("modification-request"));
assert.ok(heron.url.includes("utm_source=mcp")); assert.ok(heron.pricesAsOf);
const s = await call("search_plans", { elevated: true, elevator: true, minBedrooms: 3, maxSqFt: 2500 });
assert.equal(s.count, 5); console.log("search ok", s.count);
const f = await call("buying_help", { topic: "faq", question: "license" }); assert.equal(f.questions.length, 1);
const b = await call("buying_help", { topic: "built_homes" }); assert.equal(b.plans.length, 3);
const w = await call("buying_help", { topic: "whats_included" }); assert.ok(w.text.includes("Chief Architect"));
const lot = await call("plans_for_lot", { lotWidthFt: 50, lotDepthFt: 100, elevated: true }); assert.ok(lot.matches > 0);
assert.ok(findPlan("Heron")); assert.equal(findPlan(""), undefined);

// store down: falls back to baked data
_setLive(null);
const down = async () => { throw new Error("offline"); };
const heron2 = JSON.parse((await callTool("get_plan", { plan: "the-heron" }, down)).content[0].text);
assert.equal(heron2.name, "The Heron"); assert.ok(heron2.priceFrom > 0); assert.equal(heron2.images, undefined);
const fq = JSON.parse((await callTool("buying_help", { topic: "faq" }, down)).content[0].text); assert.ok(fq.text);

// HTTP surface
_setLive(live);
const post = (body) => worker.fetch(new Request("https://x/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const tl = await (await post({ jsonrpc: "2.0", id: 1, method: "tools/list" })).json();
assert.equal(tl.result.tools.length, 6);
const card = await (await worker.fetch(new Request("https://x/.well-known/mcp/server-card.json"))).json(); assert.equal(card.serverInfo.version, "1.2.0");
console.log("ALL TESTS PASSED");
const gj = await (await worker.fetch(new Request("https://x/mcp/.well-known/glama.json"))).json();
assert.equal(gj.claim, "glama_claim_FedZeY2NDZq66_6CNoDKVam8Q3bKL0rr"); console.log("GLAMA CLAIM OK");
