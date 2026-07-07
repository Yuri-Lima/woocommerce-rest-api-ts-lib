# woo-mcp-server

**Model Context Protocol (MCP) server for WooCommerce** — lets Claude, GPT, and other AI agents manage products, orders, customers, coupons, reports, and more through typed tools with Zod validation.

Built on top of [`woocommerce-rest-ts-api`](https://www.npmjs.com/package/woocommerce-rest-ts-api) v8 (OAuth 1.0a / HTTPS Basic Auth). This package is a thin orchestration layer — it does **not** reimplement the HTTP stack.

## Features

- **60+ purpose-built tools** following `woo_{resource}_{action}` naming
- **Zod input + output validation** on every tool
- **Pagination metadata** (`total`, `totalPages`, `currentPage`) on list tools
- **Search tools** for products and customers; rich order filters
- **Batch tools** for products and orders
- **Resources**: `woo://store/info`, `woo://api/schema`
- **Prompts**: `store-audit`, `order-report`, `inventory-check`
- **STDIO transport** (Claude Desktop compatible)
- **Rate limiting** via `WC_RATE_LIMIT_PER_SECOND` (default 5)
- **Fail-fast config** — missing `WC_URL` / `WC_KEY` / `WC_SECRET` aborts startup

## Install

```bash
# From this monorepo
pnpm install
pnpm --filter woo-mcp-server build

# Or globally (when published)
npm install -g woo-mcp-server
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WC_URL` | **yes** | — | Store base URL, e.g. `https://mystore.com` |
| `WC_KEY` | **yes** | — | REST API consumer key (`ck_...`) |
| `WC_SECRET` | **yes** | — | REST API consumer secret (`cs_...`) |
| `WC_VERSION` | no | `wc/v3` | API version prefix |
| `WC_RATE_LIMIT_PER_SECOND` | no | `5` | Max outgoing requests per second |
| `WC_QUERY_STRING_AUTH` | no | `false` | `true` to pass credentials as query params |

Create keys under **WooCommerce → Settings → Advanced → REST API** (Read/Write).

## Run

```bash
export WC_URL=https://mystore.com
export WC_KEY=ck_xxxxxxxx
export WC_SECRET=cs_xxxxxxxx

npx woo-mcp-server
# or
pnpm --filter woo-mcp-server start
```

## Claude Desktop config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent path on your OS:

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

From a local monorepo checkout:

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

## Architecture

```
AI client (Claude / GPT / …)
        │  MCP (STDIO)
        ▼
┌───────────────────────────┐
│  woo-mcp-server          │
│  • Zod input validation   │
│  • Tool handlers          │
│  • Rate limiter           │
│  • Error normalization    │
│  • Zod output validation  │
└─────────────┬─────────────┘
              │  woocommerce-rest-ts-api
              ▼
      WooCommerce REST API (OAuth / HTTPS)
```

## Tool reference

### Products

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_products_list` | List products with filters & pagination | — |
| `woo_products_get` | Get product by ID | `id` |
| `woo_products_create` | Create product | `name` |
| `woo_products_update` | Update product fields | `id`, `data` |
| `woo_products_delete` | Delete product | `id` |
| `woo_products_search` | Free-text product search | `query` |
| `woo_products_batch` | Batch create/update/delete | create/update/delete arrays |

### Orders

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_orders_list` | List orders (status, dates, customer) | — |
| `woo_orders_get` | Get order by ID | `id` |
| `woo_orders_create` | Create order | — |
| `woo_orders_update` | Update order | `id`, `data` |
| `woo_orders_delete` | Delete order | `id` |
| `woo_orders_notes_list` | List order notes | `order_id` |
| `woo_orders_notes_create` | Add order note | `order_id`, `note` |
| `woo_orders_batch` | Batch order operations | create/update/delete arrays |

### Customers

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_customers_list` | List customers | — |
| `woo_customers_get` | Get customer | `id` |
| `woo_customers_create` | Create customer | `email` |
| `woo_customers_update` | Update customer | `id`, `data` |
| `woo_customers_delete` | Delete customer | `id` |
| `woo_customers_search` | Search customers | `query` |

### Coupons

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_coupons_list` | List coupons | — |
| `woo_coupons_get` | Get coupon | `id` |
| `woo_coupons_create` | Create coupon | `code` |
| `woo_coupons_update` | Update coupon | `id`, `data` |
| `woo_coupons_delete` | Delete coupon | `id` |

### Categories & tags

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_categories_list` | List product categories | — |
| `woo_categories_get` | Get category | `id` |
| `woo_categories_create` | Create category | `name` |
| `woo_categories_update` | Update category | `id`, `data` |
| `woo_categories_delete` | Delete category | `id` |
| `woo_tags_list` | List product tags | — |
| `woo_tags_get` | Get tag | `id` |
| `woo_tags_create` | Create tag | `name` |
| `woo_tags_update` | Update tag | `id`, `data` |
| `woo_tags_delete` | Delete tag | `id` |

### Variations

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_variations_list` | List variations | `product_id` |
| `woo_variations_get` | Get variation | `product_id`, `id` |
| `woo_variations_create` | Create variation | `product_id`, `data` |
| `woo_variations_update` | Update variation | `product_id`, `id`, `data` |
| `woo_variations_delete` | Delete variation | `product_id`, `id` |

### Shipping

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_shipping_zones_list` | List shipping zones | — |
| `woo_shipping_zones_get` | Get zone | `id` |
| `woo_shipping_zone_methods_list` | List methods in zone | `zone_id` |
| `woo_shipping_methods_list` | List method types | — |
| `woo_shipping_classes_list` | List shipping classes | — |
| `woo_shipping_classes_get` | Get shipping class | `id` |

### Payments

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_payments_list` | List payment gateways | — |
| `woo_payments_get` | Get gateway | `id` |
| `woo_payments_update` | Update gateway settings | `id`, `data` |

### Reports

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_reports_sales` | Sales report | — |
| `woo_reports_top_sellers` | Top sellers | — |
| `woo_reports_orders_totals` | Orders by status | — |
| `woo_reports_customers_totals` | Customer totals | — |
| `woo_reports_products_totals` | Product type totals | — |
| `woo_reports_coupons_totals` | Coupon totals | — |
| `woo_reports_reviews_totals` | Review totals | — |

### Settings

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_settings_groups_list` | List settings groups | — |
| `woo_settings_list` | List options in group | `group` |
| `woo_settings_get` | Get one option | `group`, `id` |
| `woo_settings_update` | Update option value | `group`, `id`, `value` |

### System status

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_system_status_get` | Full system status | — |
| `woo_system_status_tools_list` | List maintenance tools | — |
| `woo_system_status_tools_run` | Run maintenance tool | `id` |

### Webhooks

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_webhooks_list` | List webhooks | — |
| `woo_webhooks_get` | Get webhook | `id` |
| `woo_webhooks_create` | Create webhook | `topic`, `delivery_url` |
| `woo_webhooks_update` | Update webhook | `id`, `data` |
| `woo_webhooks_delete` | Delete webhook | `id` |

### Tax

| Tool | Description | Required params |
|------|-------------|-----------------|
| `woo_tax_rates_list` | List tax rates | — |
| `woo_tax_rates_get` | Get tax rate | `id` |
| `woo_tax_rates_create` | Create tax rate | `rate` |
| `woo_tax_rates_update` | Update tax rate | `id`, `data` |
| `woo_tax_rates_delete` | Delete tax rate | `id` |
| `woo_tax_classes_list` | List tax classes | — |
| `woo_tax_classes_get` | Get tax class by slug | `slug` |

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

## Development

```bash
# From repo root
pnpm install
pnpm run build                          # library + mcp-server
pnpm --filter woo-mcp-server test       # unit + integration (≥80% coverage)
```

### Package layout

```
packages/mcp-server/
  src/
    server.ts          # MCP bootstrap (STDIO)
    cli.ts             # bin entry
    config.ts          # env validation
    client.ts          # rate-limited WooCommerce client
    types.ts           # shared Zod schemas
    errors.ts          # MCP error normalization
    registry.ts        # registers all tools/resources/prompts
    tools/             # one file per domain
    resources/
    prompts/
  tests/
    tools/
    integration/
    fixtures/
```

## License

MIT — same as the parent library.
