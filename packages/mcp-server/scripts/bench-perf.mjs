#!/usr/bin/env node
/**
 * Performance / memory impact proof for MCP server optimizations.
 *
 * Measures before/after deltas for:
 *  1. Compact JSON vs pretty-print (textContent)
 *  2. Product list field projection (summary vs full)
 *  3. System status slim vs full
 *  4. Error detail truncation
 *  5. Token-bucket RateLimiter burst vs legacy spacing chain
 *  6. Combined list tool payload (compact + summary)
 *
 * Prerequisites: pnpm --filter woo-mcp-server build
 * Run: pnpm --filter woo-mcp-server bench:perf
 * Exit 0 only if every case meets its minimum impact threshold.
 */

import { performance } from "node:perf_hooks";
import {
  compactJson,
  textContent,
  PRODUCT_SUMMARY_FIELDS,
  resolveListFields,
  estimateTokensFromText,
  RateLimiter,
  slimSystemStatus,
  formatErrorDetails,
  MAX_ERROR_DETAILS_CHARS,
} from "../dist/server.js";

function projectFields(item, fieldsCsv) {
  const keys = fieldsCsv.split(",").map((s) => s.trim());
  const out = {};
  for (const k of keys) {
    if (k in item) out[k] = item[k];
  }
  return out;
}

function makeProduct(i) {
  return {
    id: i,
    name: `Product ${i}`,
    slug: `product-${i}`,
    permalink: `https://shop.example/product/product-${i}`,
    type: "simple",
    status: "publish",
    description:
      "<p>" +
      "A long HTML product description that appears in full REST responses. ".repeat(12) +
      "</p>",
    short_description: `<p>Short excerpt for product ${i}</p>`,
    sku: `SKU-${i}`,
    price: "29.99",
    regular_price: "29.99",
    sale_price: "",
    stock_quantity: 50,
    stock_status: "instock",
    manage_stock: true,
    categories: [{ id: 15, name: "Apparel", slug: "apparel" }],
    tags: [{ id: 3, name: "summer", slug: "summer" }],
    images: Array.from({ length: 4 }, (_, j) => ({
      id: i * 10 + j,
      src: `https://cdn.example/img/${i}-${j}.jpg`,
      name: `Image ${j}`,
      alt: `Alt text for image ${j} of product ${i}`,
    })),
    meta_data: Array.from({ length: 8 }, (_, j) => ({
      id: j,
      key: `_custom_meta_${j}`,
      value: "v".repeat(40),
    })),
    attributes: [],
    default_attributes: [],
    variations: [],
    menu_order: 0,
  };
}

function makeSystemStatus() {
  return {
    environment: {
      home_url: "http://localhost:8088",
      site_url: "http://localhost:8088",
      version: "9.0.0",
      wp_version: "6.5",
      php_version: "8.2",
      mysql_version: "8.0",
      mysql_version_string: "8.0.36",
      wc_version: "9.0.0",
      server_info: "nginx/1.25",
      memory_limit: "256M",
      max_execution_time: "300",
      wp_memory_limit: "256M",
      wp_debug_mode: false,
      wp_cron: true,
      language: "en_US",
      external_object_cache: false,
      sudo: false,
      remote_post_response: "200",
      remote_get_response: "200",
      default_timezone: "UTC",
      fsockopen_or_curl_enabled: true,
      soapclient_enabled: true,
      domdocument_enabled: true,
      gzip_enabled: true,
      mbstring_enabled: true,
      remote_post_successful: true,
      remote_get_successful: true,
    },
    database: {
      wc_database_version: "9.0.0",
      database_prefix: "wp_",
      maxmind_geoip_database: "",
      database_size: { data: "120MB", index: "40MB" },
      database_tables: Object.fromEntries(
        Array.from({ length: 60 }, (_, i) => [
          `wp_table_${i}`,
          { data: "1.2MB", index: "0.4MB", engine: "InnoDB" },
        ]),
      ),
    },
    active_plugins: Array.from({ length: 35 }, (_, i) => ({
      plugin: `plugin-${i}/plugin.php`,
      name: `Plugin ${i}`,
      version: "1.2.3",
      version_latest: "1.2.3",
      author_name: "Author Name",
      network_activated: false,
      author_url: "https://example.com/author/" + "a".repeat(60),
      plugin_uri: "https://example.com/plugin/" + "b".repeat(60),
    })),
    theme: {
      name: "Storefront",
      version: "4.5.0",
      version_latest: "4.5.0",
      author_url: "https://woocommerce.com",
      is_child_theme: false,
      has_woocommerce_support: true,
      has_woocommerce_file: true,
      has_outdated_templates: false,
      overrides: Array.from({ length: 20 }, (_, i) => `template-${i}.php`),
      parent_name: "",
      parent_version: "",
      parent_author_url: "",
    },
    settings: {
      currency: "USD",
      currency_symbol: "$",
      currency_position: "left",
      number_of_decimals: 2,
      thousand_separator: ",",
      decimal_separator: ".",
      taxonomies: { product_type: "product_type" },
      product_visibility_terms: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [`term_${i}`, `val_${i}`]),
      ),
      woocommerce_api_enabled: true,
      woocommerce_calc_taxes: "yes",
      force_ssl: false,
    },
    security: { secure_connection: false, hide_errors: true },
    pages: Array.from({ length: 8 }, (_, i) => ({
      page_name: `Page ${i}`,
      page_id: i,
      page_set: i > 0,
      page_exists: i > 0,
      page_visible: true,
      shortcode: "[woocommerce]",
      shortcode_required: true,
      shortcode_present: true,
    })),
  };
}

/** Legacy spacing RateLimiter for comparison (pre-optimization behavior). */
class SpacingRateLimiter {
  constructor(rps) {
    this.intervalMs = Math.ceil(1000 / Math.max(1, rps));
    this.lastRequestAt = 0;
    this.chain = Promise.resolve();
  }
  async schedule(fn) {
    const run = this.chain.then(async () => {
      const now = Date.now();
      const wait = Math.max(0, this.lastRequestAt + this.intervalMs - now);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastRequestAt = Date.now();
    });
    this.chain = run.catch(() => undefined);
    await run;
    return fn();
  }
}

function pctSaved(before, after) {
  return ((before - after) / before) * 100;
}

function row(name, before, after, unit, minPct, okExtra = true) {
  const saved = pctSaved(before, after);
  const ok = saved >= minPct && okExtra;
  return { name, before, after, unit, saved, minPct, ok };
}

async function main() {
  const results = [];
  const products = Array.from({ length: 20 }, (_, i) => makeProduct(i + 1));
  const listPayload = {
    items: products,
    pagination: { total: 20, totalPages: 1, currentPage: 1, perPage: 20 },
  };

  // ── 1. Compact vs pretty JSON ────────────────────────────────────────────
  const pretty = JSON.stringify(listPayload, null, 2);
  const compactViaText = textContent(listPayload, { includeUsage: false }).content[0]
    .text;
  // Sanity: compactJson matches textContent path without usage
  if (compactJson(listPayload) !== compactViaText) {
    throw new Error("compactJson / textContent mismatch");
  }
  results.push(
    row(
      "1. Compact JSON (list of 20 products)",
      pretty.length,
      compactViaText.length,
      "chars",
      20,
    ),
  );

  // ── 2. Field projection ──────────────────────────────────────────────────
  const fields = resolveListFields("summary", undefined, PRODUCT_SUMMARY_FIELDS);
  const slimItems = products.map((p) => projectFields(p, fields));
  const fullSize = JSON.stringify({ items: products }).length;
  const slimSize = JSON.stringify({ items: slimItems }).length;
  results.push(
    row("2. Product list _fields summary (20 items)", fullSize, slimSize, "chars", 45),
  );

  // ── 3. System status slim ────────────────────────────────────────────────
  const status = makeSystemStatus();
  const slimStatus = slimSystemStatus(status);
  const fullStatusSize = JSON.stringify(status).length;
  const slimStatusSize = JSON.stringify(slimStatus).length;
  results.push(
    row(
      "3. System status summary vs full",
      fullStatusSize,
      slimStatusSize,
      "chars",
      50,
    ),
  );

  // ── 4. Error truncation ──────────────────────────────────────────────────
  const fatDetails = {
    code: "internal_server_error",
    message: "Database error",
    data: { html: "<html>" + "x".repeat(8000) + "</html>" },
  };
  const untruncated = JSON.stringify(fatDetails);
  const truncated = formatErrorDetails(fatDetails);
  results.push(
    row(
      "4. Error details truncation",
      untruncated.length,
      truncated.length,
      "chars",
      85,
      truncated.length <= MAX_ERROR_DETAILS_CHARS + 40,
    ),
  );

  // ── 5. Rate limiter burst latency ────────────────────────────────────────
  const rps = 20;
  const jobs = 15; // within bucket capacity; spacing serializes all

  const spacing = new SpacingRateLimiter(rps);
  const t0 = performance.now();
  await Promise.all(
    Array.from({ length: jobs }, () => spacing.schedule(async () => undefined)),
  );
  const spacingMs = performance.now() - t0;

  const bucket = new RateLimiter(rps, 8);
  const t1 = performance.now();
  await Promise.all(
    Array.from({ length: jobs }, () => bucket.schedule(async () => undefined)),
  );
  const tokenMs = performance.now() - t1;

  const latencySaved = pctSaved(spacingMs, tokenMs);
  results.push({
    name: "5. RateLimiter burst (15 jobs @ 20 RPS)",
    before: Math.round(spacingMs),
    after: Math.round(tokenMs),
    unit: "ms",
    saved: latencySaved,
    minPct: 40,
    ok: latencySaved >= 40 && tokenMs < spacingMs,
  });

  // ── 6. Combined MCP tool payload (compact + summary fields) ──────────────
  const legacyToolText = JSON.stringify(
    { items: products, pagination: listPayload.pagination },
    null,
    2,
  );
  const modernToolText = textContent(
    {
      items: slimItems,
      pagination: listPayload.pagination,
    },
    { includeUsage: false },
  ).content[0].text;
  results.push(
    row(
      "6. Combined list tool payload (compact+summary)",
      legacyToolText.length,
      modernToolText.length,
      "chars",
      55,
    ),
  );

  const legacyTokens = estimateTokensFromText(legacyToolText);
  const modernTokens = estimateTokensFromText(modernToolText);

  // ── Report ───────────────────────────────────────────────────────────────
  console.log("\nMCP server performance / memory impact proof\n");
  console.log(
    "Case".padEnd(52) +
      "Before".padStart(10) +
      "After".padStart(10) +
      "Saved".padStart(10) +
      "  Min   Pass",
  );
  console.log("-".repeat(96));

  let allOk = true;
  for (const r of results) {
    const mark = r.ok ? "✓" : "✗";
    if (!r.ok) allOk = false;
    console.log(
      r.name.padEnd(52) +
        String(r.before).padStart(10) +
        String(r.after).padStart(10) +
        `${r.saved.toFixed(1)}%`.padStart(10) +
        `${r.minPct}%`.padStart(6) +
        `  ${mark}`,
    );
  }

  console.log("-".repeat(96));
  console.log(
    `\nEstimated model tokens for 20-product list tool result:\n` +
      `  legacy (pretty + full):     ~${legacyTokens} tokens\n` +
      `  modern (compact + summary): ~${modernTokens} tokens\n` +
      `  reduction: ${pctSaved(legacyTokens, modernTokens).toFixed(1)}%\n`,
  );

  if (!allOk) {
    console.error("FAILED: one or more cases did not meet impact thresholds.");
    process.exit(1);
  }
  console.log("All impact thresholds met.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
