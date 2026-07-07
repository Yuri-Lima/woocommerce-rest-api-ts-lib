# Free local WooCommerce store (real MCP live tests)

There is **no public free WooCommerce sandbox with shared write API keys** (that would be a security disaster).  
For a **real** MCP integration test you need your own temporary store. Options:

| Option | Cost | Best for | Notes |
|--------|------|----------|--------|
| **This Docker stack** (`scripts/live-wc`) | Free | Automated live MCP tests | Recommended — no cloud account |
| [TasteWP](https://tastewp.com) | Free temp site | Manual / browser setup | Sites expire; install WooCommerce + create REST key |
| [InstaWP](https://instawp.com) | Free tier | Dev sandboxes | WooCommerce blueprints available |
| [WPSandbox](https://wpsandbox.net) | Free temp | Plugin testing | Full wp-admin |
| [LocalWP](https://localwp.com) | Free desktop | Long-lived local | Use ngrok if external access needed |
| Free shared hosts | Free | Long-lived public URL | Often too slow/unstable for WC |

## Quick start (Docker — what we use for live MCP tests)

**Requirements:** Docker Desktop (or Docker Engine + Compose).

```bash
# From repo root
cd scripts/live-wc
docker compose up -d

# Wait ~10s for MySQL healthy, then:
# 1) Install WP + WooCommerce + sample products + API keys
#    (or re-run the steps in bootstrap.sh after fixing WP version)

# After keys exist in .env.live:
export $(grep -v '^#' .env.live | xargs)
# HTTP local stores must use OAuth (not query-string auth):
export WC_QUERY_STRING_AUTH=false

# Real MCP live suite (8 tests: list/search/CRUD products, orders, customers, resources)
export LIVE_WC=1
cd ../../packages/mcp-server
node --experimental-vm-modules ../../node_modules/jest/bin/jest.js \
  --config jest.config.cjs --coverage=false \
  tests/integration/live-store.test.ts
```

### What the live suite proves

1. MCP server boots with real `WC_*` credentials  
2. Tools call a **real** WooCommerce REST API (not nock)  
3. **Read**: products list/search, system status, store-info resource  
4. **Write**: product create/update/delete, order create + note, customer create/delete  
5. OAuth 1.0a over plain HTTP works via `woocommerce-rest-ts-api`

### Store defaults

| Item | Value |
|------|--------|
| URL | http://127.0.0.1:8088 |
| Admin | http://127.0.0.1:8088/wp-admin |
| User / pass | `admin` / `adminpass123` |
| Sample products | Blue T-Shirt, Red Hat, Green Mug |

### Teardown

```bash
cd scripts/live-wc
docker compose down -v   # removes DB + WP volumes
```

## Cloud free store (manual, public URL)

If you need a **public** URL (e.g. Claude Desktop on another machine):

1. Open https://tastewp.com → **Create Temp Site** (or InstaWP free site).  
2. In wp-admin: **Plugins → Add New → WooCommerce → Install & Activate**.  
3. Run the WooCommerce setup wizard (currency, address).  
4. **WooCommerce → Settings → Advanced → REST API → Add key**  
   - Permissions: **Read/Write**  
   - Copy `ck_…` and `cs_…` (secret shown once).  
5. Export env and run the same live tests / Claude Desktop config.

```bash
export WC_URL=https://your-temp-site.s?.wpdns.site
export WC_KEY=ck_xxxxxxxx
export WC_SECRET=cs_xxxxxxxx
export WC_QUERY_STRING_AUTH=true   # fine over HTTPS
export LIVE_WC=1
# then run live-store.test.ts as above
```

## Why not a shared public demo store?

WooCommerce has no official “sandbox credentials” program like Stripe. Any store with permanent **Read/Write** keys published on the internet would be vandalized within minutes. Always use **your own** temp or local store.
