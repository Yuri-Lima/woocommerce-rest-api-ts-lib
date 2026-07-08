# woo-mcp-server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-STDIO-5b9dff)](https://modelcontextprotocol.io/)
[![WooCommerce](https://img.shields.io/badge/WooCommerce-REST%20v3-96588a)](https://woocommerce.github.io/woocommerce-rest-api-docs/)

**Model Context Protocol (MCP) server for WooCommerce** — so Claude Desktop, GPT-based agents, and any MCP client can manage products, orders, customers, coupons, reports, and more through **typed tools** with **Zod validation**.

Built on [`woocommerce-rest-ts-api`](https://www.npmjs.com/package/woocommerce-rest-ts-api) (OAuth 1.0a / HTTPS Basic Auth). This package is a thin orchestration layer — it does **not** reimplement the HTTP stack.

---

## Docs & interactive UI

| Resource | How to open | What you get |
|----------|-------------|----------------|
| **Developer presentation** (step-by-step + use cases) | `make ui-presentation` | Full slide deck: setup, tools, 6 use-case scenarios, live evidence, repo map |
| **Tool explorer dashboard** | `make ui` | Searchable catalog, mock tester, architecture, Claude config generator |
| **This README** | — | Install, env, tool reference, development |

```bash
# From the monorepo root
make ui-presentation   # http://127.0.0.1:8765/presentation.html
make ui                # http://127.0.0.1:8765/  (tool explorer)
```

Or open the static files directly:

- [`ui/presentation.html`](../../ui/presentation.html) — slide deck (keyboard: `←` `→`, `O` overview, `F` fullscreen)
- [`ui/index.html`](../../ui/index.html) — interactive tool explorer

---

## Why this exists

| Without MCP | With `woo-mcp-server` |
|-------------|------------------------|
| Agents invent raw `/wp-json/wc/v3/…` paths | Purpose-built tools: `woo_products_list`, … |
| OAuth 1.0a easy to get wrong | Library owns signing, retries, limits |
| One-off scripts per automation | One STDIO binary for any MCP host |
| Secrets leak into notebooks / prompts | Env-only credentials, fail-fast at startup |

---

## Features

- **80+ purpose-built tools** — `woo_{resource}_{action}` naming (no catch-all HTTP free-for-all)
- **Zod input + output validation** on every tool
- **Always-on token / usage reporting** — every tool result includes estimated payload tokens; host LLM rounds can be recorded and audited (see [Token usage](#token-usage))
- **Pagination metadata** (`total`, `totalPages`, `currentPage`) on list tools
- **Search tools** for products and customers; rich order filters
- **Order refunds** and **product reviews** CRUD for support / moderation agents
- **Batch tools** for products and orders (ERP-style sync)
- **Resources**: `woo://store/info`, `woo://api/schema`
- **Prompts**: `store-audit`, `order-report`, `inventory-check`
- **STDIO transport** — Claude Desktop compatible
- **Token-bucket rate limiting** via `WC_RATE_LIMIT_PER_SECOND` (default `5`) — single throttle point (no double-limit with the REST library)
- **Compact tool payloads** — JSON without pretty-print whitespace; list tools default to `detail=summary` (`_fields` projection)
- **Slim system status** — `woo_system_status_get` defaults to a health-check summary (full report on demand)
- **Bounded error/session memory** — truncated error details, capped usage ring buffers
- **Fail-fast config** — missing `WC_URL` / `WC_KEY` / `WC_SECRET` aborts with a clear message
- **Live-tested** against WooCommerce **10.9.3** (Docker) — see [Live testing](#live-testing)

---

## Quick start

### 1. Install

**From npm (recommended for agents / Claude Desktop):**

```bash
npm install -g woo-mcp-server
# or one-shot without a global install
npx -y woo-mcp-server
```

This pulls [`woocommerce-rest-ts-api`](https://www.npmjs.com/package/woocommerce-rest-ts-api) `^8` automatically.

**From this monorepo (development):**

```bash
git clone https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib.git
cd woocommerce-rest-api-ts-lib
pnpm install
pnpm run build
```

### 2. Configure credentials

Create a **Read/Write** key under **WooCommerce → Settings → Advanced → REST API**.

```bash
export WC_URL=https://mystore.com
export WC_KEY=ck_xxxxxxxx
export WC_SECRET=cs_xxxxxxxx
# Local HTTP Docker stores: leave query-string auth OFF (use OAuth)
export WC_QUERY_STRING_AUTH=false
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WC_URL` | **yes** | — | Store base URL |
| `WC_KEY` | **yes** | — | Consumer key (`ck_…`) |
| `WC_SECRET` | **yes** | — | Consumer secret (`cs_…`) |
| `WC_VERSION` | no | `wc/v3` | API version prefix |
| `WC_RATE_LIMIT_PER_SECOND` | no | `5` | Outbound throttle |
| `WC_QUERY_STRING_AUTH` | no | `false` | `true` on some HTTPS hosts only |

### 3. Run the server

```bash
npx woo-mcp-server
# or from monorepo
pnpm --filter woo-mcp-server start
```

### 4. Wire Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "woocommerce": {
      "command": "npx",
      "args": ["woo-mcp-server"],
      "env": {
        "WC_URL": "https://mystore.com",
        "WC_KEY": "ck_xxxxxxxx",
        "WC_SECRET": "cs_xxxxxxxx",
        "WC_RATE_LIMIT_PER_SECOND": "5"
      }
    }
  }
}
```

**Local monorepo (dev):**

```json
{
  "mcpServers": {
    "woocommerce": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp-server/dist/cli.js"],
      "env": {
        "WC_URL": "https://mystore.com",
        "WC_KEY": "ck_xxxxxxxx",
        "WC_SECRET": "cs_xxxxxxxx"
      }
    }
  }
}
```

---

## Architecture

```
AI client (Claude Desktop / custom MCP agent)
        │  MCP over STDIO
        │  (host records model token usage → woo_model_usage_record)
        ▼
┌─────────────────────────────────┐
│  woo-mcp-server                │
│  • Zod input validation         │
│  • Domain tool handlers         │
│  • Always-on payload usage      │
│  • Session usage rollups        │
│  • Rate limiter                 │
│  • Error normalization          │
│  • Zod output validation        │
└───────────────┬─────────────────┘
                │  woocommerce-rest-ts-api
                ▼
      WooCommerce REST API (OAuth 1.0a / HTTPS)
```

The parent library remains the source of truth for HTTP, auth, retries, and types. MCP never rewrites `src/` of the library.

---

## Use-case scenarios

Walk through these end-to-end in the [developer presentation](../../ui/presentation.html) (`make ui-presentation`).

| # | Scenario | Primary tools / prompts |
|---|----------|-------------------------|
| 1 | **Support copilot** — “Where is my order?” | `woo_customers_search` → `woo_orders_list` / `get` → `woo_orders_notes_create` / refunds |
| 2 | **Inventory ops** — weekly low-stock list | prompt `inventory-check` + `woo_products_list` / variations |
| 3 | **Sales report agent** — monthly narrative | prompt `order-report` + `woo_reports_*` |
| 4 | **Catalog SEO audit** | prompt `store-audit` (read-only until human approves updates) |
| 5 | **Bulk import / price sync** | `woo_products_batch` / `woo_orders_batch` |
| 6 | **Custom agent runtime** | MCP SDK client over STDIO (see presentation slide) |
| 7 | **Cost-aware agent** — audit LLM + tool cost | tool `usage` field + `woo_usage_stats` / `woo_model_usage_record` |

---

## Token usage

Agents that call many tools (or multi-round tool loops with Claude / GPT) need a clear cost signal. `woo-mcp-server` always surfaces usage in two layers:

| Layer | What it measures | Where you see it |
|-------|------------------|------------------|
| **Tool payload usage** | Size of each MCP tool response (chars + estimated tokens) | On **every** successful object result as `usage`, and on MCP `_meta["woo.usage"]` |
| **Host model usage** | Real LLM API tokens (`input_tokens` / `output_tokens`) from Anthropic, OpenAI, etc. | Recorded via `woo_model_usage_record` or `ModelUsageTracker`, then read with `woo_usage_stats` |

The MCP server does **not** call Anthropic/OpenAI itself. Model tokens only exist on the **host** that runs the model. Hosts should record each round so the session stays auditable.

### Always-on tool payload `usage`

Every successful tool that returns a JSON object includes a `usage` field (payload estimate only — not WooCommerce API billing):

```json
{
  "items": [ { "id": 12, "name": "Green Mug" } ],
  "pagination": {
    "total": 3,
    "totalPages": 1,
    "currentPage": 1,
    "perPage": 2
  },
  "usage": {
    "response_chars": 3854,
    "estimated_response_tokens": 964,
    "at": "2026-07-08T09:31:35.892Z"
  }
}
```

The same estimate is attached as MCP metadata:

```json
{
  "_meta": {
    "woo.usage": {
      "response_chars": 3854,
      "estimated_response_tokens": 964,
      "at": "2026-07-08T09:31:35.892Z"
    }
  }
}
```

**Estimate formula:** `estimated_response_tokens = max(1, ceil(response_chars / 4))` for the business payload (before the `usage` object is attached). This is a stable cost signal for agents, not a billing-grade tokenizer.

Errors also carry `_meta["woo.usage"]` (with `is_error: true`) so failed calls still count toward session rollups.

### Usage tools

| Tool | Description | Required |
|------|-------------|---------|
| `woo_usage_stats` | Session snapshot: tool-call counts, estimated response tokens by tool, and any recorded model totals | — |
| `woo_model_usage_record` | Push one host LLM round into the session (provider, model, input/output tokens, optional cache fields) | `input_tokens`, `output_tokens` |

Optional args:

| Tool | Optional fields |
|------|-----------------|
| `woo_usage_stats` | `reset` — if `true`, clear session counters after returning the snapshot |
| `woo_model_usage_record` | `provider` (default `anthropic`), `model`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `stop_reason`, `round` |

Example — record an Anthropic Messages API round, then audit:

```json
// tools/call woo_model_usage_record
{
  "provider": "anthropic",
  "model": "claude-haiku-4-5-20251001",
  "input_tokens": 1650,
  "output_tokens": 59,
  "stop_reason": "tool_use",
  "round": 1
}
```

```json
// tools/call woo_usage_stats → (shape)
{
  "tools": {
    "tool_calls": 3,
    "error_calls": 0,
    "total_response_chars": 6328,
    "total_estimated_response_tokens": 1584,
    "by_tool": { "woo_products_list": { "calls": 1, "estimated_response_tokens": 964 } },
    "recent": [ /* last N tool results */ ]
  },
  "models": {
    "reports": 1,
    "totals": {
      "rounds": 1,
      "input_tokens": 1650,
      "output_tokens": 59,
      "total_tokens": 1709,
      "by_model": { "claude-haiku-4-5-20251001": { "rounds": 1, "total_tokens": 1709 } }
    }
  },
  "usage": { "response_chars": 350, "estimated_response_tokens": 88, "at": "..." }
}
```

### Programmatic host: `ModelUsageTracker`

When you build a custom agent (MCP SDK client + Anthropic/OpenAI), use the exported tracker so **every multi-round loop always ends with totals**:

```ts
import {
  createServer,
  ModelUsageTracker,
} from "woo-mcp-server";

const modelUsage = new ModelUsageTracker("anthropic");

// after each Messages API response:
modelUsage.addRound(response.usage, {
  model: "claude-haiku-4-5-20251001",
  stop_reason: response.stop_reason,
});

// after the tool loop finishes — always call finalize():
const report = modelUsage.finalize();
// report.totals.input_tokens / output_tokens / total_tokens
// report.rounds[] — per-round breakdown
// also stored in the process session → visible via woo_usage_stats
```

`ModelUsageTracker` accepts Anthropic-style (`input_tokens` / `output_tokens`) and OpenAI-style (`prompt_tokens` / `completion_tokens`) usage objects.

### Anthropic smoke script (low token cost)

From the package (with a live store + `ANTHROPIC_API_KEY`):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export WC_URL=http://127.0.0.1:8088
export WC_KEY=ck_...
export WC_SECRET=cs_...
export WC_QUERY_STRING_AUTH=false   # local HTTP Docker

# Optional: ANTHROPIC_MODEL (default claude-haiku-4-5-20251001)
# Optional: ANTHROPIC_MAX_TOKENS (default 256)
node packages/mcp-server/scripts/anthropic-mcp-smoke.mjs
```

The script:

1. Exposes only a **small** tool subset to Claude (keeps prompt tokens low).
2. Runs a short tool-use loop against the live store.
3. **Always** prints per-round and total model usage under `--- TOKEN USAGE ---`.
4. Prints MCP session usage (`woo_usage_stats`) under `--- MCP SESSION USAGE ---`.

Full live tool sweep (no Anthropic tokens):

```bash
node packages/mcp-server/scripts/live-endpoint-sweep.mjs
```

### Recommended agent pattern

```
for each user task:
  call model with tools
  while stop_reason == tool_use:
    execute MCP tools          → each result includes usage.estimated_response_tokens
    modelUsage.addRound(...)   → or woo_model_usage_record
    call model again with tool_results
  modelUsage.finalize()        → always return totals to logs / user / metrics
  optional: woo_usage_stats    → full session audit
```

---

## Tool reference

Naming: `woo_{resource}_{action}`. Every tool description is multi-sentence (what + when/why).

### Products

| Tool | Description | Required |
|------|-------------|---------|
| `woo_products_list` | List products (default `detail=summary` slim `_fields`) | — |
| `woo_products_get` | Get product by ID | `id` |
| `woo_products_create` | Create product | `name` |
| `woo_products_update` | Update product fields | `id`, `data` |
| `woo_products_delete` | Delete product | `id` |
| `woo_products_search` | Free-text product search | `query` |
| `woo_products_batch` | Batch create/update/delete | create/update/delete arrays |

### Orders

| Tool | Description | Required |
|------|-------------|---------|
| `woo_orders_list` | List orders (default `detail=summary` slim `_fields`) | — |
| `woo_orders_get` | Get order by ID | `id` |
| `woo_orders_create` | Create order | — |
| `woo_orders_update` | Update order | `id`, `data` |
| `woo_orders_delete` | Delete order | `id` |
| `woo_orders_notes_list` | List order notes | `order_id` |
| `woo_orders_notes_create` | Add order note | `order_id`, `note` |
| `woo_orders_refunds_list` | List refunds for an order | `order_id` |
| `woo_orders_refunds_get` | Get a single refund | `order_id`, `id` |
| `woo_orders_refunds_create` | Create full/partial refund | `order_id` (+ optional `amount`, `reason`, `line_items`) |
| `woo_orders_refunds_delete` | Delete a refund record | `order_id`, `id` |
| `woo_orders_batch` | Batch order operations | create/update/delete arrays |

### Customers

| Tool | Description | Required |
|------|-------------|---------|
| `woo_customers_list` | List customers (default `detail=summary` slim `_fields`) | — |
| `woo_customers_get` | Get customer | `id` |
| `woo_customers_create` | Create customer | `email` |
| `woo_customers_update` | Update customer | `id`, `data` |
| `woo_customers_delete` | Delete customer | `id` |
| `woo_customers_search` | Search customers | `query` |

### Coupons

| Tool | Description | Required |
|------|-------------|---------|
| `woo_coupons_list` | List coupons | — |
| `woo_coupons_get` | Get coupon | `id` |
| `woo_coupons_create` | Create coupon | `code` |
| `woo_coupons_update` | Update coupon | `id`, `data` |
| `woo_coupons_delete` | Delete coupon | `id` |

### Reviews

| Tool | Description | Required |
|------|-------------|---------|
| `woo_reviews_list` | List product reviews | — |
| `woo_reviews_get` | Get review | `id` |
| `woo_reviews_create` | Create review | `product_id`, `review`, `reviewer`, `reviewer_email` |
| `woo_reviews_update` | Update review | `id`, `data` |
| `woo_reviews_delete` | Delete review | `id` |

### Categories & tags

| Tool | Description | Required |
|------|-------------|---------|
| `woo_categories_list` / `get` / `create` / `update` / `delete` | Product categories CRUD | varies |
| `woo_tags_list` / `get` / `create` / `update` / `delete` | Product tags CRUD | varies |

### Variations

| Tool | Description | Required |
|------|-------------|---------|
| `woo_variations_list` | List variations | `product_id` |
| `woo_variations_get` | Get variation | `product_id`, `id` |
| `woo_variations_create` | Create variation | `product_id`, `data` |
| `woo_variations_update` | Update variation | `product_id`, `id`, `data` |
| `woo_variations_delete` | Delete variation | `product_id`, `id` |

### Shipping

| Tool | Description | Required |
|------|-------------|---------|
| `woo_shipping_zones_list` / `get` | Shipping zones | — / `id` |
| `woo_shipping_zone_methods_list` | Methods in a zone | `zone_id` |
| `woo_shipping_methods_list` | Method types | — |
| `woo_shipping_classes_list` / `get` | Shipping classes | — / `id` |

### Payments

| Tool | Description | Required |
|------|-------------|---------|
| `woo_payments_list` | List payment gateways | — |
| `woo_payments_get` | Get gateway | `id` |
| `woo_payments_update` | Update gateway settings | `id`, `data` |

### Reports

| Tool | Description | Required |
|------|-------------|---------|
| `woo_reports_sales` | Sales report | — |
| `woo_reports_top_sellers` | Top sellers | — |
| `woo_reports_orders_totals` | Orders by status | — |
| `woo_reports_customers_totals` | Customer totals | — |
| `woo_reports_products_totals` | Product type totals | — |
| `woo_reports_coupons_totals` | Coupon totals | — |
| `woo_reports_reviews_totals` | Review totals | — |

### Settings · system status · webhooks · tax · usage

| Domain | Tools |
|--------|--------|
| Settings | `woo_settings_groups_list`, `woo_settings_list`, `woo_settings_get`, `woo_settings_update` |
| System status | `woo_system_status_get`, `woo_system_status_tools_list`, `woo_system_status_tools_run` |
| Webhooks | `woo_webhooks_list` / `get` / `create` / `update` / `delete` |
| Tax | `woo_tax_rates_*`, `woo_tax_classes_list` / `get` |
| Usage | `woo_usage_stats`, `woo_model_usage_record` — see [Token usage](#token-usage) |

---

## Resources

| URI | Description |
|-----|-------------|
| `woo://store/info` | Store name, URL, currency, timezone, WC/WP/PHP versions |
| `woo://api/schema` | Endpoint map + corresponding MCP tool names |

## Prompts

| Name | Description |
|------|-------------|
| `store-audit` | Audit products for missing images, descriptions, categories, stock, SEO |
| `order-report` | Sales summary by status/revenue/top products for a date range |
| `inventory-check` | Find low-stock products, group by category, suggest reorder qty |

---

## Performance & memory

High-volume agent loops pay for every byte returned as model input tokens. The server defaults to lean payloads:

| Optimization | Default | Escape hatch |
|--------------|---------|--------------|
| Compact JSON (`textContent`) | no pretty-print | n/a (always compact) |
| List `_fields` projection | `detail=summary` on products / orders / customers lists | `detail=full` or custom `fields` |
| System status | `detail=summary` slim health report | `detail=full`, optional `sections` |
| Rate limit | token bucket at MCP layer only | `WC_RATE_LIMIT_PER_SECOND` |
| Errors | details capped (~500 chars) | n/a |
| Usage session | recent tool/model rings capped | n/a |

Prove impact after build:

```bash
pnpm --filter woo-mcp-server build
pnpm --filter woo-mcp-server bench:perf
```

The bench fails the process if any case misses its minimum savings threshold (compact JSON, field projection, system status, error caps, rate-limiter burst, combined list payload).

---

## Development

```bash
# From repo root
pnpm install
pnpm run build                          # library + mcp-server
pnpm --filter woo-mcp-server test       # unit + integration (nock; ≥80% coverage)
pnpm --filter woo-mcp-server typecheck
pnpm --filter woo-mcp-server bench:perf # impact proof for perf/memory opts
```

### Package layout

```
packages/mcp-server/
  src/
    server.ts          # MCP bootstrap (STDIO); exports ModelUsageTracker + perf helpers
    cli.ts             # bin entry (woo-mcp-server)
    config.ts          # env validation
    client.ts          # token-bucket RateLimiter + WooCommerce client
    types.ts           # Zod schemas + compact textContent + list field projection
    usage.ts           # payload estimates + session + ModelUsageTracker (capped)
    errors.ts          # MCP error normalization (+ truncated details)
    registry.ts        # registers all tools/resources/prompts
    tools/             # one file per domain (incl. usage.ts, reviews.ts)
    resources/
    prompts/
  scripts/
    anthropic-mcp-smoke.mjs   # Claude + MCP smoke; always prints token usage
    live-endpoint-sweep.mjs   # exercise all tools against a live store
    bench-perf.mjs            # performance / memory impact proof
  tests/
    tools/
    usage.test.ts
    system-status-slim.test.ts
    integration/       # e2e (in-memory MCP) + live-store (opt-in)
    fixtures/
```

### Live testing

There is no public shared WooCommerce sandbox with write keys. Use the free local Docker stack:

```bash
cd scripts/live-wc
docker compose up -d
./bootstrap.sh
export $(grep -v '^#' .env.live | xargs)
export WC_QUERY_STRING_AUTH=false
export LIVE_WC=1

pnpm --filter woo-mcp-server test -- tests/integration/live-store.test.ts
```

See [`scripts/live-wc/README.md`](../../scripts/live-wc/README.md). Proven against **WordPress 7 + WooCommerce 10.9.3** over OAuth on `http://127.0.0.1:8088`.

Optional: full tool sweep and Anthropic usage smoke (requires keys):

```bash
node packages/mcp-server/scripts/live-endpoint-sweep.mjs
# with ANTHROPIC_API_KEY set:
node packages/mcp-server/scripts/anthropic-mcp-smoke.mjs
```

---

## Library vs MCP — when to use which

| Need | Use the library directly | Use `woo-mcp-server` |
|------|--------------------------|----------------------|
| Backend service / worker | Yes — typed TS imports | Optional |
| AI agent / Claude / GPT tools | — | **Yes — designed for this** |
| Fine-grained control of every request | Yes | — |
| Shared tool schemas across models | — | Yes (Zod → MCP) |

---

## Security notes

- **Never** commit real `ck_` / `cs_` keys.
- Prefer OAuth over HTTP local stores (`WC_QUERY_STRING_AUTH=false`).
- Batch `delete` with `force: true` is permanent — dry-run on staging/Docker first.
- The server only exposes the fixed tool surface; models cannot invent arbitrary endpoints.

---

## License

MIT — same as the parent library [`woocommerce-rest-ts-api`](https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib).
