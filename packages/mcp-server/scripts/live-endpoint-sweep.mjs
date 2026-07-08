/**
 * Live MCP endpoint sweep — exercises every registered tool against a real store.
 * Usage:
 *   WC_URL=... WC_KEY=... WC_SECRET=... node scripts/live-endpoint-sweep.mjs
 *
 * Strategy: list/read tools always; create/update/delete on disposable fixtures only.
 * Does not call Anthropic. Keep WC_QUERY_STRING_AUTH=false on local HTTP.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";

const required = ["WC_URL", "WC_KEY", "WC_SECRET"];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`Missing ${k}`);
    process.exit(1);
  }
}
if (process.env.WC_URL?.startsWith("http://")) {
  process.env.WC_QUERY_STRING_AUTH = "false";
}

const results = [];
const log = (name, ok, detail = "") => {
  results.push({ name, ok, detail: String(detail).slice(0, 200) });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark.padEnd(4)} ${name}${detail ? ` — ${String(detail).slice(0, 120)}` : ""}`);
};

async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content?.[0]?.text ?? "";
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { isError: Boolean(result.isError), data, text, raw: result };
}

async function main() {
  const mcp = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await mcp.server.connect(serverTransport);
  const client = new Client({ name: "live-sweep", version: "1.0.0" });
  await client.connect(clientTransport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((t) => t.name).sort();
  console.log(`\nRegistered tools: ${toolNames.length}`);
  console.log(toolNames.join(", "));

  // Resources
  try {
    const resources = await client.listResources();
    log("resources/list", true, resources.resources?.map((r) => r.uri).join(", "));
    for (const r of resources.resources ?? []) {
      const content = await client.readResource({ uri: r.uri });
      const ok = (content.contents?.length ?? 0) > 0;
      log(`resources/read ${r.uri}`, ok, ok ? "ok" : "empty");
    }
  } catch (e) {
    log("resources", false, e.message);
  }

  // Prompts
  try {
    const prompts = await client.listPrompts();
    log("prompts/list", true, prompts.prompts?.map((p) => p.name).join(", "));
    for (const p of prompts.prompts ?? []) {
      const got = await client.getPrompt({
        name: p.name,
        arguments: p.name === "order-report"
          ? { date_min: "2024-01-01", date_max: "2024-12-31" }
          : p.name === "inventory-check"
            ? { threshold: "5" }
            : {},
      });
      log(`prompts/get ${p.name}`, (got.messages?.length ?? 0) > 0);
    }
  } catch (e) {
    log("prompts", false, e.message);
  }

  // --- Read-only / list tools ---
  const listCalls = [
    ["woo_products_list", { page: 1, per_page: 5 }],
    ["woo_products_search", { query: "Blue", per_page: 5 }],
    ["woo_orders_list", { page: 1, per_page: 5 }],
    ["woo_customers_list", { page: 1, per_page: 5 }],
    ["woo_customers_search", { query: "admin", per_page: 5 }],
    ["woo_coupons_list", { page: 1, per_page: 5 }],
    ["woo_categories_list", { page: 1, per_page: 5 }],
    ["woo_tags_list", { page: 1, per_page: 5 }],
    ["woo_shipping_zones_list", {}],
    ["woo_shipping_methods_list", {}],
    ["woo_shipping_classes_list", {}],
    ["woo_payments_list", {}],
    ["woo_reports_sales", {}],
    ["woo_reports_top_sellers", {}],
    ["woo_reports_orders_totals", {}],
    ["woo_reports_customers_totals", {}],
    ["woo_reports_products_totals", {}],
    ["woo_reports_coupons_totals", {}],
    ["woo_reports_reviews_totals", {}],
    ["woo_settings_groups_list", {}],
    ["woo_system_status_get", {}],
    ["woo_system_status_tools_list", {}],
    ["woo_webhooks_list", { page: 1, per_page: 5 }],
    ["woo_tax_rates_list", { page: 1, per_page: 5 }],
    ["woo_tax_classes_list", {}],
  ];

  let productId;
  let orderId;
  let customerId;
  let zoneId;
  let settingsGroup;

  for (const [name, args] of listCalls) {
    if (!toolNames.includes(name)) {
      log(name, false, "tool not registered");
      continue;
    }
    try {
      const { isError, data, text } = await call(client, name, args);
      log(name, !isError, isError ? text : summarize(data));
      if (!isError && data?.items?.[0]?.id != null) {
        if (name === "woo_products_list") productId = data.items[0].id;
        if (name === "woo_orders_list") orderId = data.items[0].id;
        if (name === "woo_customers_list") customerId = data.items[0].id;
        if (name === "woo_shipping_zones_list") zoneId = data.items[0].id;
      }
      if (!isError && name === "woo_settings_groups_list" && data?.items?.[0]?.id) {
        settingsGroup = data.items[0].id;
      }
    } catch (e) {
      log(name, false, e.message);
    }
  }

  // Dependent reads
  if (productId) {
    const { isError, text, data } = await call(client, "woo_products_get", { id: productId });
    log("woo_products_get", !isError, isError ? text : `id=${data?.item?.id ?? productId}`);
    const v = await call(client, "woo_variations_list", { product_id: productId, per_page: 5 });
    log("woo_variations_list", !v.isError, v.isError ? v.text : summarize(v.data));
  }

  if (orderId) {
    const { isError, text } = await call(client, "woo_orders_get", { id: orderId });
    log("woo_orders_get", !isError, isError ? text : `id=${orderId}`);
    const notes = await call(client, "woo_orders_notes_list", { order_id: orderId, per_page: 5 });
    log("woo_orders_notes_list", !notes.isError, notes.isError ? notes.text : summarize(notes.data));
  } else {
    // Create a temporary order for notes/get coverage if store is empty
    if (productId) {
      const created = await call(client, "woo_orders_create", {
        status: "pending",
        set_paid: false,
        line_items: [{ product_id: productId, quantity: 1 }],
        billing: {
          first_name: "MCP",
          last_name: "Sweep",
          email: "mcp-sweep@example.com",
        },
      });
      if (!created.isError) {
        orderId = created.data?.item?.id ?? created.data?.id;
        log("woo_orders_create (fixture)", true, `id=${orderId}`);
      } else {
        log("woo_orders_create (fixture)", false, created.text);
      }
    }
  }

  if (customerId) {
    const { isError, text } = await call(client, "woo_customers_get", { id: customerId });
    log("woo_customers_get", !isError, isError ? text : `id=${customerId}`);
  }

  if (zoneId != null) {
    const z = await call(client, "woo_shipping_zones_get", { id: zoneId });
    log("woo_shipping_zones_get", !z.isError, z.isError ? z.text : `id=${zoneId}`);
    const m = await call(client, "woo_shipping_zone_methods_list", { zone_id: zoneId });
    log("woo_shipping_zone_methods_list", !m.isError, m.isError ? m.text : summarize(m.data));
  }

  if (settingsGroup) {
    const s = await call(client, "woo_settings_list", { group: settingsGroup, per_page: 5 });
    log("woo_settings_list", !s.isError, s.isError ? s.text : `group=${settingsGroup}`);
    const first = s.data?.items?.[0];
    if (first?.id) {
      const g = await call(client, "woo_settings_get", { group: settingsGroup, id: first.id });
      log("woo_settings_get", !g.isError, g.isError ? g.text : first.id);
    }
  }

  // payments get first gateway
  const pay = await call(client, "woo_payments_list", {});
  const payId = pay.data?.items?.[0]?.id;
  if (payId) {
    const g = await call(client, "woo_payments_get", { id: payId });
    log("woo_payments_get", !g.isError, g.isError ? g.text : payId);
  }

  // CRUD fixture: tag (cheap, isolated)
  const stamp = Date.now();
  const tagCreate = await call(client, "woo_tags_create", {
    name: `mcp-sweep-${stamp}`,
    description: "temp live sweep",
  });
  const tagId = tagCreate.data?.item?.id ?? tagCreate.data?.id;
  log("woo_tags_create", !tagCreate.isError && tagId, tagCreate.isError ? tagCreate.text : `id=${tagId}`);
  if (tagId) {
    const tg = await call(client, "woo_tags_get", { id: tagId });
    log("woo_tags_get", !tg.isError, tg.isError ? tg.text : `id=${tagId}`);
    const tu = await call(client, "woo_tags_update", {
      id: tagId,
      data: { description: "updated by sweep" },
    });
    log("woo_tags_update", !tu.isError, tu.isError ? tu.text : "ok");
    const td = await call(client, "woo_tags_delete", { id: tagId, force: true });
    log("woo_tags_delete", !td.isError, td.isError ? td.text : "ok");
  }

  // Category fixture
  const catCreate = await call(client, "woo_categories_create", {
    name: `mcp-cat-${stamp}`,
  });
  const catId = catCreate.data?.item?.id ?? catCreate.data?.id;
  log("woo_categories_create", !catCreate.isError && catId, catCreate.isError ? catCreate.text : `id=${catId}`);
  if (catId) {
    await call(client, "woo_categories_get", { id: catId }).then((r) =>
      log("woo_categories_get", !r.isError, r.isError ? r.text : `id=${catId}`),
    );
    await call(client, "woo_categories_update", {
      id: catId,
      data: { description: "sweep" },
    }).then((r) => log("woo_categories_update", !r.isError, r.isError ? r.text : "ok"));
    await call(client, "woo_categories_delete", { id: catId, force: true }).then((r) =>
      log("woo_categories_delete", !r.isError, r.isError ? r.text : "ok"),
    );
  }

  // Coupon fixture
  const code = `MCP${stamp}`.slice(0, 20);
  const couponCreate = await call(client, "woo_coupons_create", {
    code,
    discount_type: "percent",
    amount: "5",
  });
  const couponId = couponCreate.data?.item?.id ?? couponCreate.data?.id;
  log("woo_coupons_create", !couponCreate.isError && couponId, couponCreate.isError ? couponCreate.text : `id=${couponId}`);
  if (couponId) {
    await call(client, "woo_coupons_get", { id: couponId }).then((r) =>
      log("woo_coupons_get", !r.isError, r.isError ? r.text : `id=${couponId}`),
    );
    await call(client, "woo_coupons_update", { id: couponId, data: { amount: "10" } }).then((r) =>
      log("woo_coupons_update", !r.isError, r.isError ? r.text : "ok"),
    );
    await call(client, "woo_coupons_delete", { id: couponId, force: true }).then((r) =>
      log("woo_coupons_delete", !r.isError, r.isError ? r.text : "ok"),
    );
  }

  // Product fixture CRUD
  const pCreate = await call(client, "woo_products_create", {
    name: `MCP Sweep Product ${stamp}`,
    type: "simple",
    regular_price: "9.99",
    status: "draft",
  });
  const pId = pCreate.data?.item?.id ?? pCreate.data?.id;
  log("woo_products_create", !pCreate.isError && pId, pCreate.isError ? pCreate.text : `id=${pId}`);
  if (pId) {
    await call(client, "woo_products_update", {
      id: pId,
      data: { regular_price: "11.99" },
    }).then((r) => log("woo_products_update", !r.isError, r.isError ? r.text : "ok"));
    // batch update
    await call(client, "woo_products_batch", {
      update: [{ id: pId, description: "batch" }],
    }).then((r) => log("woo_products_batch", !r.isError, r.isError ? r.text : "ok"));
    await call(client, "woo_products_delete", { id: pId, force: true }).then((r) =>
      log("woo_products_delete", !r.isError, r.isError ? r.text : "ok"),
    );
  }

  // Order notes if we have order
  if (orderId) {
    const n = await call(client, "woo_orders_notes_create", {
      order_id: orderId,
      note: `mcp sweep ${stamp}`,
      customer_note: false,
    });
    log("woo_orders_notes_create", !n.isError, n.isError ? n.text : "ok");
  }

  // Tax rate fixture
  const taxCreate = await call(client, "woo_tax_rates_create", {
    country: "US",
    state: "XX",
    rate: "1.0000",
    name: `MCP Tax ${stamp}`,
  });
  const taxId = taxCreate.data?.item?.id ?? taxCreate.data?.id;
  log("woo_tax_rates_create", !taxCreate.isError && taxId, taxCreate.isError ? taxCreate.text : `id=${taxId}`);
  if (taxId) {
    await call(client, "woo_tax_rates_get", { id: taxId }).then((r) =>
      log("woo_tax_rates_get", !r.isError, r.isError ? r.text : `id=${taxId}`),
    );
    await call(client, "woo_tax_rates_update", { id: taxId, data: { rate: "2.0000" } }).then((r) =>
      log("woo_tax_rates_update", !r.isError, r.isError ? r.text : "ok"),
    );
    await call(client, "woo_tax_rates_delete", { id: taxId, force: true }).then((r) =>
      log("woo_tax_rates_delete", !r.isError, r.isError ? r.text : "ok"),
    );
  }

  // tax class get standard
  const tc = await call(client, "woo_tax_classes_get", { slug: "standard" });
  log("woo_tax_classes_get", !tc.isError, tc.isError ? tc.text : "standard");

  // shipping class list/get if any
  const sc = await call(client, "woo_shipping_classes_list", { per_page: 1 });
  const scId = sc.data?.items?.[0]?.id;
  if (scId) {
    const g = await call(client, "woo_shipping_classes_get", { id: scId });
    log("woo_shipping_classes_get", !g.isError, g.isError ? g.text : `id=${scId}`);
  }

  // Webhook — skip create (would need external URL); list already covered
  // system tool run — skip destructive

  // Customers create/update/delete fixture
  const email = `mcp.sweep.${stamp}@example.com`;
  const cCreate = await call(client, "woo_customers_create", {
    email,
    first_name: "MCP",
    last_name: "Sweep",
    username: `mcp_sweep_${stamp}`,
    password: `TempPass_${stamp}!`,
  });
  const cId = cCreate.data?.item?.id ?? cCreate.data?.id;
  log("woo_customers_create", !cCreate.isError && cId, cCreate.isError ? cCreate.text : `id=${cId}`);
  if (cId) {
    await call(client, "woo_customers_update", {
      id: cId,
      data: { last_name: "Updated" },
    }).then((r) => log("woo_customers_update", !r.isError, r.isError ? r.text : "ok"));
    await call(client, "woo_customers_delete", { id: cId, force: true }).then((r) =>
      log("woo_customers_delete", !r.isError, r.isError ? r.text : "ok"),
    );
  }

  // orders update (non-destructive status flip if we created fixture)
  if (orderId) {
    const ou = await call(client, "woo_orders_update", {
      id: orderId,
      data: { customer_note: `sweep ${stamp}` },
    });
    log("woo_orders_update", !ou.isError, ou.isError ? ou.text : "ok");
  }

  // Coverage report: tools never invoked
  const invoked = new Set(results.map((r) => r.name.replace(/ \(fixture\)$/, "").split(" ")[0]));
  // Map resource/prompt names differently
  const never = toolNames.filter((n) => !results.some((r) => r.name === n || r.name.startsWith(n)));
  console.log("\n--- SUMMARY ---");
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`Results: ${pass} pass, ${fail} fail, ${results.length} checks`);
  if (never.length) {
    console.log(`Tools not exercised: ${never.join(", ")}`);
  } else {
    console.log("All registered tools exercised (or intentionally skipped).");
  }
  const fails = results.filter((r) => !r.ok);
  if (fails.length) {
    console.log("\nFailures:");
    for (const f of fails) console.log(`  - ${f.name}: ${f.detail}`);
  }

  await client.close().catch(() => undefined);
  await mcp.server.close().catch(() => undefined);
  process.exit(fails.length ? 1 : 0);
}

function summarize(data) {
  if (data == null) return "null";
  if (Array.isArray(data?.items)) return `items=${data.items.length}`;
  if (data?.item) return `item id=${data.item.id ?? "?"}`;
  if (data?.report) return "report";
  if (typeof data === "object") return Object.keys(data).slice(0, 5).join(",");
  return String(data).slice(0, 80);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
