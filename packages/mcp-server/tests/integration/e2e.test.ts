/**
 * End-to-end MCP client ↔ server tests covering tools, errors, pagination, rate limit config.
 */
import nock from "nock";
import {
  apiPath,
  callTool,
  createMcpTestContext,
  testConfig,
  TEST_BASE,
} from "../helpers.js";
import products from "../fixtures/products.json";
import { loadConfig } from "../../src/config.js";
import { createServer } from "../../src/server.js";

describe("integration e2e", () => {
  afterEach(() => nock.cleanAll());

  it("lists tools with woo_ naming convention", async () => {
    const ctx = await createMcpTestContext();
    try {
      const tools = await ctx.client.listTools();
      const names = tools.tools.map((t) => t.name);
      expect(names.every((n) => n.startsWith("woo_"))).toBe(true);
      expect(names).toEqual(
        expect.arrayContaining([
          "woo_products_list",
          "woo_orders_list",
          "woo_customers_search",
          "woo_reports_sales",
        ]),
      );
      // descriptions must be multi-sentence
      const productList = tools.tools.find((t) => t.name === "woo_products_list");
      expect(productList?.description?.length).toBeGreaterThan(40);
      expect(productList?.description).toMatch(/\./);
    } finally {
      await ctx.cleanup();
    }
  });

  it("paginates products correctly", async () => {
    const ctx = await createMcpTestContext();
    try {
      nock(TEST_BASE)
        .get(apiPath("/products"))
        .query((q) => q.page === "2" && q.per_page === "1")
        .reply(200, [products[1]], {
          "x-wp-total": "2",
          "x-wp-totalpages": "2",
        });

      const { data, isError } = await callTool(ctx.client, "woo_products_list", {
        page: 2,
        per_page: 1,
      });
      expect(isError).toBe(false);
      expect(data).toMatchObject({
        pagination: {
          total: 2,
          totalPages: 2,
          currentPage: 2,
          perPage: 1,
        },
      });
      expect((data as { items: Array<{ id: number }> }).items[0].id).toBe(2);
    } finally {
      await ctx.cleanup();
    }
  });

  it("handles network failures as tool errors", async () => {
    const ctx = await createMcpTestContext();
    try {
      nock(TEST_BASE)
        .get(apiPath("/products"))
        .query(true)
        .replyWithError({ code: "ECONNREFUSED", message: "connect refused" });

      const { isError, raw } = await callTool(ctx.client, "woo_products_list", {});
      expect(isError).toBe(true);
      const text = (raw as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toMatch(/Error|refused|connect/i);
    } finally {
      await ctx.cleanup();
    }
  });

  it("handles 401 invalid credentials as structured error", async () => {
    const ctx = await createMcpTestContext();
    try {
      nock(TEST_BASE)
        .get(apiPath("/orders"))
        .query(true)
        .reply(401, {
          code: "woocommerce_rest_cannot_view",
          message: "Invalid signature",
        });

      const { isError, raw } = await callTool(ctx.client, "woo_orders_list", {});
      expect(isError).toBe(true);
      expect(
        (raw as { content: Array<{ text: string }> }).content[0].text,
      ).toMatch(/401|Invalid|authentication|Error/i);
    } finally {
      await ctx.cleanup();
    }
  });

  it("start fails without env vars", () => {
    expect(() => loadConfig({})).toThrow(/WC_URL/);
    const saved = {
      WC_URL: process.env.WC_URL,
      WC_KEY: process.env.WC_KEY,
      WC_SECRET: process.env.WC_SECRET,
    };
    delete process.env.WC_URL;
    delete process.env.WC_KEY;
    delete process.env.WC_SECRET;
    try {
      expect(() => createServer()).toThrow(/WC_URL|WC_KEY|WC_SECRET|configuration/i);
    } finally {
      if (saved.WC_URL) process.env.WC_URL = saved.WC_URL;
      if (saved.WC_KEY) process.env.WC_KEY = saved.WC_KEY;
      if (saved.WC_SECRET) process.env.WC_SECRET = saved.WC_SECRET;
    }
  });

  it("respects custom rate limit config", async () => {
    const ctx = await createMcpTestContext(
      testConfig({ WC_RATE_LIMIT_PER_SECOND: 50 }),
    );
    try {
      expect(ctx.mcp.config.WC_RATE_LIMIT_PER_SECOND).toBe(50);
      nock(TEST_BASE)
        .get(apiPath("/products"))
        .query(true)
        .times(3)
        .reply(200, [], { "x-wp-total": "0", "x-wp-totalpages": "0" });

      const start = Date.now();
      await callTool(ctx.client, "woo_products_list", {});
      await callTool(ctx.client, "woo_products_list", {});
      await callTool(ctx.client, "woo_products_list", {});
      // With 50 rps, three calls should complete quickly
      expect(Date.now() - start).toBeLessThan(2000);
    } finally {
      await ctx.cleanup();
    }
  });

  it("full happy path: list tools → call product → read resource", async () => {
    const ctx = await createMcpTestContext();
    try {
      const tools = await ctx.client.listTools();
      expect(tools.tools.length).toBeGreaterThan(40);

      nock(TEST_BASE)
        .get(apiPath("/products/1"))
        .query(true)
        .reply(200, products[0]);
      const product = await callTool(ctx.client, "woo_products_get", { id: 1 });
      expect(product.isError).toBe(false);

      nock(TEST_BASE)
        .get(apiPath("/system_status"))
        .query(true)
        .reply(200, { environment: { version: "9.0.0" }, settings: {} });
      nock(TEST_BASE)
        .get(apiPath("/settings/general"))
        .query(true)
        .reply(200, []);
      const info = await ctx.client.readResource({ uri: "woo://store/info" });
      expect(info.contents[0]?.text).toMatch(/9\.0\.0|woocommerce/i);
    } finally {
      await ctx.cleanup();
    }
  });
});
