/**
 * REAL live-store MCP integration test.
 *
 * Requires a running WooCommerce instance and env:
 *   WC_URL, WC_KEY, WC_SECRET
 *
 * Bootstrap free local store:
 *   ./scripts/live-wc/bootstrap.sh
 *   export $(grep -v '^#' scripts/live-wc/.env.live | xargs)
 *
 * Run:
 *   LIVE_WC=1 pnpm --filter woo-mcp-server exec \
 *     node --experimental-vm-modules ../../node_modules/jest/bin/jest.js \
 *     --config jest.config.cjs tests/integration/live-store.test.ts
 *
 * Skipped automatically when LIVE_WC is not set (CI stays hermetic).
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/server.js";
import { loadConfig } from "../../src/config.js";

const LIVE = process.env.LIVE_WC === "1" || process.env.LIVE_WC === "true";

const describeLive = LIVE ? describe : describe.skip;

describeLive("LIVE WooCommerce MCP integration", () => {
  let client: Client;
  let close: () => Promise<void>;

  beforeAll(async () => {
    // Prefer OAuth on plain HTTP local stores (query-string auth is flaky on HTTP)
    if (process.env.WC_QUERY_STRING_AUTH === "true" && process.env.WC_URL?.startsWith("http://")) {
      process.env.WC_QUERY_STRING_AUTH = "false";
    }
    const config = loadConfig(process.env);
    const mcp = createServer({ config });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await mcp.server.connect(serverTransport);
    client = new Client({ name: "live-test-client", version: "1.0.0" });
    await client.connect(clientTransport);
    close = async () => {
      await client.close().catch(() => undefined);
      await mcp.server.close().catch(() => undefined);
    };
  }, 60_000);

  afterAll(async () => {
    if (close) await close();
  });

  async function call(name: string, args: Record<string, unknown> = {}) {
    const result = await client.callTool({ name, arguments: args });
    const text = (result as { content?: Array<{ text?: string }> }).content?.[0]
      ?.text;
    const isError = Boolean((result as { isError?: boolean }).isError);
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : text;
    } catch {
      /* keep raw */
    }
    return { isError, data, raw: result, text };
  }

  it("lists MCP tools from live server", async () => {
    const tools = await client.listTools();
    expect(tools.tools.length).toBeGreaterThan(40);
    expect(tools.tools.some((t) => t.name === "woo_products_list")).toBe(true);
  });

  it("lists real products from the store", async () => {
    const { isError, data, text } = await call("woo_products_list", {
      page: 1,
      per_page: 10,
    });
    expect(isError).toBe(false);
    expect(data).toMatchObject({
      items: expect.any(Array),
      pagination: expect.objectContaining({
        currentPage: 1,
        perPage: 10,
      }),
    });
    const items = (data as { items: Array<{ id: number; name: string }> }).items;
    expect(items.length).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.log(
      "LIVE products:",
      items.map((p) => `${p.id}:${p.name}`).join(", "),
    );
    expect(text).not.toMatch(/Error \[/);
  });

  it("searches products", async () => {
    const { isError, data } = await call("woo_products_search", {
      query: "Blue",
      per_page: 5,
    });
    expect(isError).toBe(false);
    const items = (data as { items: unknown[] }).items;
    expect(Array.isArray(items)).toBe(true);
  });

  it("creates, updates, and deletes a product (write path)", async () => {
    const created = await call("woo_products_create", {
      name: `MCP Live Product ${Date.now()}`,
      type: "simple",
      regular_price: "7.77",
      status: "publish",
      description: "Created by live MCP integration test",
      short_description: "live test",
    });
    expect(created.isError).toBe(false);
    const id = (created.data as { item: { id: number } }).item.id;
    expect(id).toBeGreaterThan(0);

    const updated = await call("woo_products_update", {
      id,
      data: { regular_price: "8.88", name: "MCP Live Product Updated" },
    });
    expect(updated.isError).toBe(false);
    expect((updated.data as { item: { name: string } }).item.name).toMatch(
      /Updated/,
    );

    const got = await call("woo_products_get", { id });
    expect(got.isError).toBe(false);
    expect((got.data as { item: { id: number } }).item.id).toBe(id);

    const deleted = await call("woo_products_delete", { id, force: true });
    expect(deleted.isError).toBe(false);
    expect((deleted.data as { deleted: boolean }).deleted).toBe(true);
  });

  it("lists orders (may be empty) and creates a minimal order", async () => {
    const list = await call("woo_orders_list", { per_page: 5 });
    expect(list.isError).toBe(false);

    // Need a product id for line item
    const products = await call("woo_products_list", { per_page: 1 });
    const productId = (products.data as { items: Array<{ id: number }> })
      .items[0]?.id;
    expect(productId).toBeDefined();

    const order = await call("woo_orders_create", {
      status: "pending",
      set_paid: false,
      billing: {
        first_name: "MCP",
        last_name: "Tester",
        email: "mcp-live@example.com",
      },
      line_items: [{ product_id: productId, quantity: 1 }],
    });
    expect(order.isError).toBe(false);
    const orderId = (order.data as { item: { id: number } }).item.id;
    expect(orderId).toBeGreaterThan(0);

    const note = await call("woo_orders_notes_create", {
      order_id: orderId,
      note: "Created by live MCP test",
      customer_note: false,
    });
    expect(note.isError).toBe(false);

    // cleanup
    await call("woo_orders_delete", { id: orderId, force: true });
  });

  it("reads store-info resource from live system status", async () => {
    const res = await client.readResource({ uri: "woo://store/info" });
    const body = JSON.parse(res.contents[0]?.text as string);
    expect(body.url).toBeTruthy();
    // eslint-disable-next-line no-console
    console.log("LIVE store-info:", body);
    // should not be an error payload only
    expect(body.error).toBeUndefined();
  });

  it("reads system status via tool", async () => {
    const { isError, data } = await call("woo_system_status_get");
    expect(isError).toBe(false);
    expect(data).toMatchObject({ item: expect.any(Object) });
  });

  it("lists customers and creates/deletes a test customer", async () => {
    const email = `mcp.live.${Date.now()}@example.com`;
    const created = await call("woo_customers_create", {
      email,
      first_name: "MCP",
      last_name: "Live",
    });
    expect(created.isError).toBe(false);
    const id = (created.data as { item: { id: number } }).item.id;

    const search = await call("woo_customers_search", { query: "MCP" });
    expect(search.isError).toBe(false);

    const deleted = await call("woo_customers_delete", { id, force: true });
    expect(deleted.isError).toBe(false);
  });
});
