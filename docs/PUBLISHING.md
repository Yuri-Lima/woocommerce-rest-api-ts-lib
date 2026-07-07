# Publishing to npm (dual packages)

This monorepo publishes **two separate packages**:

| Package | Version (repo) | Path |
|---------|----------------|------|
| [`woocommerce-rest-ts-api`](https://www.npmjs.com/package/woocommerce-rest-ts-api) | `8.0.0` | repository root |
| [`woo-mcp-server`](https://www.npmjs.com/package/woo-mcp-server) | `1.0.0` | `packages/mcp-server` |

## How it works (best option we implemented)

1. **Dev dependency** in the monorepo:  
   `woocommerce-rest-ts-api: "workspace:^"` inside `woo-mcp-server`.
2. **On publish**, the MCP package is staged with that rewritten to **`^8.0.0`** so consumers install a real registry version.
3. **Order**: library first → MCP second (script enforces this).
4. **Release entrypoints**:
   - GitHub Action: **Actions → Release npm packages → Run workflow**
   - Local/CI script: `pnpm run publish:packages` (needs a valid token)
   - After merge to `main`, `Publish NPM CI` also calls the same script (skips versions already on npm)

## One-time: fix `NPM_TOKEN` (required)

Publish failed with **`401 Unauthorized`** because the GitHub secret `NPM_TOKEN` is set but **invalid/expired**.

npm package owner: **`yurimlima`**

### Create a new token

1. Log in to npm as **`yurimlima`**: https://www.npmjs.com/login  
2. **Access Tokens** → **Generate New Token** → type **Automation** (or **Classic** with **Publish**):  
   https://www.npmjs.com/settings/yurimlima/tokens  
3. Copy the token (starts with `npm_…`).

### Update the GitHub secret

```bash
# from a machine where you have the new token
gh secret set NPM_TOKEN --repo Yuri-Lima/woocommerce-rest-api-ts-lib
# paste token when prompted
```

Or: GitHub repo → **Settings → Secrets and variables → Actions → NPM_TOKEN → Update**.

### Re-run the release

```bash
gh workflow run release-packages.yml --ref main \
  -f dry_run=false \
  -f skip_library=false \
  -f skip_mcp=false \
  -f skip_tests=false \
  -f create_tags=true
```

Or use the Actions UI: **Release npm packages**.

### Verify

```bash
npm view woocommerce-rest-ts-api version   # expect 8.0.0
npm view woo-mcp-server version            # expect 1.0.0
npm view woo-mcp-server dependencies       # woocommerce-rest-ts-api: ^8.0.0
npx -y woo-mcp-server --help               # or just start with env set
```

## Local dry-run (no token)

```bash
pnpm run publish:packages:dry
# or
DRY_RUN=1 bash scripts/publish-packages.sh
```

## Bumping versions later

1. Edit `version` in root `package.json` and/or `packages/mcp-server/package.json`.
2. Commit, merge to `main`.
3. Re-run **Release npm packages** (already-published versions are skipped safely).

Optional long-term: [Changesets](https://github.com/changesets/changesets) or multi-semantic-release for automated dual bumps.

## Trusted Publishing (optional alternative to long-lived tokens)

If you prefer OIDC instead of `NPM_TOKEN`:

1. On npm → package → **Settings → Trusted Publisher → GitHub Actions**
2. Repository: `Yuri-Lima/woocommerce-rest-api-ts-lib`
3. Workflow: `release-packages.yml`
4. Re-enable `permissions: id-token: write` and `npm publish --provenance`

Configure **both** packages (library + MCP). New packages may need a first classic-token publish before Trusted Publishing applies—follow npm’s current docs.

## Consumers

```bash
# library only
npm i woocommerce-rest-ts-api

# MCP server (pulls library as dependency)
npm i -g woo-mcp-server
npx -y woo-mcp-server
```

Claude Desktop:

```json
{
  "mcpServers": {
    "woocommerce": {
      "command": "npx",
      "args": ["-y", "woo-mcp-server"],
      "env": {
        "WC_URL": "https://mystore.com",
        "WC_KEY": "ck_xxxxxxxx",
        "WC_SECRET": "cs_xxxxxxxx"
      }
    }
  }
}
```
