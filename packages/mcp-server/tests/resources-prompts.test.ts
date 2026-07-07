import nock from "nock";
import {
  apiPath,
  createMcpTestContext,
  TEST_BASE,
} from "./helpers.js";

describe("resources and prompts", () => {
  let ctx: Awaited<ReturnType<typeof createMcpTestContext>>;

  beforeEach(async () => {
    nock.cleanAll();
    ctx = await createMcpTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it("lists resources including store-info and api-schema", async () => {
    const list = await ctx.client.listResources();
    const uris = list.resources.map((r) => r.uri);
    expect(uris).toEqual(
      expect.arrayContaining(["woo://store/info", "woo://api/schema"]),
    );
  });

  it("reads woo://store/info", async () => {
    nock(TEST_BASE)
      .get(apiPath("/system_status"))
      .query(true)
      .reply(200, {
        environment: {
          version: "9.1.0",
          wp_version: "6.6",
          php_version: "8.3",
          default_timezone: "UTC",
        },
        settings: { currency: "USD", currency_symbol: "$", weight_unit: "kg" },
      });
    nock(TEST_BASE)
      .get(apiPath("/settings/general"))
      .query(true)
      .reply(200, [
        { id: "woocommerce_currency", value: "USD" },
        { id: "woocommerce_store_address", value: "123 Main" },
      ]);

    const res = await ctx.client.readResource({ uri: "woo://store/info" });
    const text = res.contents[0]?.text as string;
    const body = JSON.parse(text);
    expect(body.woocommerce_version).toBe("9.1.0");
    expect(body.currency).toBe("USD");
    expect(body.url).toBe(TEST_BASE);
  });

  it("reads woo://api/schema", async () => {
    nock(TEST_BASE)
      .options(apiPath("/products"))
      .query(true)
      .reply(200, { routes: {} });

    const res = await ctx.client.readResource({ uri: "woo://api/schema" });
    const body = JSON.parse(res.contents[0]?.text as string);
    expect(body.endpoints).toEqual(expect.any(Array));
    expect(body.version).toMatch(/wc/);
  });

  it("lists prompts store-audit, order-report, inventory-check", async () => {
    const list = await ctx.client.listPrompts();
    const names = list.prompts.map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "store-audit",
        "order-report",
        "inventory-check",
      ]),
    );
  });

  it("gets store-audit prompt messages", async () => {
    const prompt = await ctx.client.getPrompt({
      name: "store-audit",
      arguments: { sample_size: "25", focus: "seo" },
    });
    expect(prompt.messages.length).toBeGreaterThan(0);
    const text = prompt.messages[0]?.content;
    const body =
      typeof text === "object" && text && "text" in text
        ? (text as { text: string }).text
        : String(text);
    expect(body).toMatch(/audit/i);
    expect(body).toMatch(/25/);
  });

  it("gets order-report and inventory-check prompts", async () => {
    const order = await ctx.client.getPrompt({
      name: "order-report",
      arguments: { date_min: "2024-01-01", date_max: "2024-01-31" },
    });
    expect(JSON.stringify(order.messages)).toMatch(/2024-01-01/);

    const inv = await ctx.client.getPrompt({
      name: "inventory-check",
      arguments: { threshold: "3" },
    });
    expect(JSON.stringify(inv.messages)).toMatch(/3/);
  });
});
