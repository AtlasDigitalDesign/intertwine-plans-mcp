# Intertwine House Plans: Plan Finder MCP server

A read-only MCP server that lets AI assistants search the house plans of residential designer Angela Kamer, sold direct at [intertwinehouseplans.com](https://intertwinehouseplans.com). Buyers ask for things like an elevated coastal plan with an elevator under 2,000 square feet, or a plan that fits a 50 by 100 foot lot. The server answers with matching plans, their specs and a link to each plan's own page.

Endpoint: https://agents.intertwinehouseplans.com/mcp (Streamable HTTP, stateless, no auth)
Server card: https://agents.intertwinehouseplans.com/.well-known/mcp/server-card.json
Same data as JSON: https://agents.intertwinehouseplans.com/plans.json

## Tools

- `search_plans`: bedrooms, bathrooms, heated square feet, stories, maximum width and depth, elevated or pilings foundation, elevator, drive-under garage, in-law suite, garage ADU, style (beach, cottage, Low Country, carriage house), words in the description, starting price
- `get_plan`: full specs for one plan by name, for example The Heron
- `plans_for_lot`: plans whose footprint fits a lot after setbacks (a first screen, not a zoning check)
- `list_features`: the styles and features, with plan counts
- `about_designer`: who draws the plans, file formats, study sets and modifications

## Try it

```
curl -X POST https://agents.intertwinehouseplans.com/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_plans","arguments":{"elevated":true,"elevator":true,"minBedrooms":3}}}'
```

## How it runs

`src/worker.js` is a Cloudflare Worker. It answers JSON-RPC at `/mcp` from `src/plans.json`, which holds the public plan specs from the store's product pages. Nothing is written and there are no accounts or keys. `node test.mjs` runs the tests.

## Data

68 plan sets (57 house plans and 11 garage ADU plans) by Angela Kamer, residential designer. Specs come from the store's own plan data. Prices are starting prices for the PDF set and can change. The plan page is always the source of truth.

Built by [Atlas Digital Design](https://atlasdigital.design).
