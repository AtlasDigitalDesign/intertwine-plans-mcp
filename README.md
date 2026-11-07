# Intertwine House Plans: Plan Finder MCP server

A read-only MCP server that lets AI assistants search the house plans of residential designer Angela Kamer, sold direct at [intertwinehouseplans.com](https://intertwinehouseplans.com). Buyers ask for things like an elevated coastal plan with an elevator under 2,000 square feet, or a plan that fits a 50 by 100 foot lot. The server answers with matching plans, their specs, photos, current prices and a link to each plan's own page.

Endpoint: https://agents.intertwinehouseplans.com/mcp (Streamable HTTP, stateless, no auth)
Server card: https://agents.intertwinehouseplans.com/.well-known/mcp/server-card.json
Same data as JSON: https://agents.intertwinehouseplans.com/plans.json

## Tools

- `search_plans`: bedrooms, bathrooms, heated square feet, stories, maximum width and depth, elevated or pilings foundation, elevator, drive-under garage, in-law suite, garage ADU, style (beach, cottage, Low Country, carriage house), words in the description, starting price. Each result has a photo and the current price, with the regular price when a sale is running.
- `get_plan`: everything about one plan by name, for example The Heron: specs, garage, ceilings, roof pitch, framing, the smallest lot it suits, foundation options, every package with its price, photos and floor plans, the full write-up, the study set and how to request changes
- `plans_for_lot`: plans whose footprint fits a lot after setbacks (a first screen, not a zoning check)
- `list_features`: the styles and features, with plan counts
- `about_designer`: who draws the plans, file formats, study sets and modifications
- `buying_help`: what a plan set includes, study sets, changing a plan, cost to build, plans that have been built, and the store's FAQ

## Try it

```
curl -X POST https://agents.intertwinehouseplans.com/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_plans","arguments":{"elevated":true,"elevator":true,"minBedrooms":3}}}'
```

## How it runs

`src/worker.js` is a Cloudflare Worker. Plan specs are in `src/plans.json`. Photos, package prices, sale prices, the write-ups, study sets and the FAQ are read from the store's public pages and kept for 30 minutes, so prices are never more than half an hour old. If the store can't be reached, every tool still answers from the specs. Nothing is written and there are no accounts or keys. `node test.mjs` runs the tests.

## Data

68 plan sets (57 house plans and 11 garage ADU plans) by Angela Kamer, residential designer. The plan page is always the source of truth.

Built by [Atlas Digital Design](https://atlasdigital.design).
