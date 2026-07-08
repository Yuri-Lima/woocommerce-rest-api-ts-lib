import nock from "nock";
import products from "../fixtures/products.json";
import {
  apiPath,
  callTool,
  createMcpTestContext,
  TEST_BASE,
} from "../helpers.js";

describe("product tools", () => {
  let ctx: Awaited<ReturnType<typeof createMcpTestContext>>;

  beforeEach(async () => {
    nock.cleanAll();
    ctx = await createMcpTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it("woo_products_list returns paginated products", async () => {
    nock(TEST_BASE)
      .get(apiPath("/products"))
      .query((q) => q.page === "1" && q.per_page === "10")
      .reply(200, products, {
        "x-wp-total": "2",
        "x-wp-totalpages": "1",
      });

    const { data, isError } = await callTool(ctx.client, "woo_products_list", {
      page: 1,
      per_page: 10,
    });
    expect(isError).toBe(false);
    expect(data).toMatchObject({
      pagination: { total: 2, totalPages: 1, currentPage: 1, perPage: 10 },
    });
    expect((data as { items: unknown[] }).items).toHaveLength(2);
  });

  it("woo_products_list default summary sends _fields projection", async () => {
    nock(TEST_BASE)
      .get(apiPath("/products"))
      .query((q) => typeof q._fields === "string" && String(q._fields).includes("id"))
      .reply(200, [{ id: 1, name: "Slim", price: "9.99" }], {
        "x-wp-total": "1",
        "x-wp-totalpages": "1",
      });

    const { data, isError } = await callTool(ctx.client, "woo_products_list", {
      page: 1,
      per_page: 5,
    });
    expect(isError).toBe(false);
    expect((data as { items: unknown[] }).items[0]).toMatchObject({ id: 1 });
  });

  it("woo_products_list detail=full omits _fields", async () => {
    nock(TEST_BASE)
      .get(apiPath("/products"))
      .query((q) => q._fields === undefined)
      .reply(200, products, {
        "x-wp-total": "2",
        "x-wp-totalpages": "1",
      });

    const { isError } = await callTool(ctx.client, "woo_products_list", {
      page: 1,
      per_page: 10,
      detail: "full",
    });
    expect(isError).toBe(false);
  });

  it("woo_products_get returns a single product", async () => {
    nock(TEST_BASE)
      .get(apiPath("/products/1"))
      .query(true)
      .reply(200, products[0]);

    const { data, isError } = await callTool(ctx.client, "woo_products_get", {
      id: 1,
    });
    expect(isError).toBe(false);
    expect(data).toMatchObject({ item: { id: 1, name: "Blue T-Shirt" } });
  });

  it("woo_products_create posts product", async () => {
    nock(TEST_BASE)
      .post(apiPath("/products"), (body) => body.name === "New")
      .query(true)
      .reply(201, { id: 99, name: "New" });

    const { data, isError } = await callTool(ctx.client, "woo_products_create", {
      name: "New",
      regular_price: "10.00",
    });
    expect(isError).toBe(false);
    expect(data).toMatchObject({ item: { id: 99 } });
  });

  it("woo_products_update puts product", async () => {
    nock(TEST_BASE)
      .put(apiPath("/products/1"))
      .query(true)
      .reply(200, { id: 1, name: "Updated" });

    const { data, isError } = await callTool(ctx.client, "woo_products_update", {
      id: 1,
      data: { name: "Updated" },
    });
    expect(isError).toBe(false);
    expect(data).toMatchObject({ item: { name: "Updated" } });
  });

  it("woo_products_delete deletes product", async () => {
    nock(TEST_BASE)
      .delete(apiPath("/products/1"))
      .query(true)
      .reply(200, { id: 1 });

    const { data, isError } = await callTool(ctx.client, "woo_products_delete", {
      id: 1,
      force: true,
    });
    expect(isError).toBe(false);
    expect(data).toMatchObject({ deleted: true, id: 1 });
  });

  it("woo_products_search uses search query", async () => {
    nock(TEST_BASE)
      .get(apiPath("/products"))
      .query((q) => q.search === "blue")
      .reply(200, [products[0]], {
        "x-wp-total": "1",
        "x-wp-totalpages": "1",
      });

    const { data, isError } = await callTool(ctx.client, "woo_products_search", {
      query: "blue",
    });
    expect(isError).toBe(false);
    expect((data as { items: unknown[] }).items).toHaveLength(1);
  });

  it("woo_products_batch posts batch ops", async () => {
    nock(TEST_BASE)
      .post(apiPath("/products/batch"))
      .query(true)
      .reply(200, {
        create: [{ id: 10 }],
        update: [{ id: 1 }],
        delete: [{ id: 2 }],
      });

    const { data, isError } = await callTool(ctx.client, "woo_products_batch", {
      create: [{ name: "X" }],
      update: [{ id: 1, name: "Y" }],
      delete: [2],
    });
    expect(isError).toBe(false);
    expect(data).toMatchObject({ create: [{ id: 10 }] });
  });

  it("returns structured MCP error on API failure", async () => {
    nock(TEST_BASE)
      .get(apiPath("/products/999"))
      .query(true)
      .reply(404, { code: "woocommerce_rest_product_invalid_id", message: "Invalid ID" });

    const { isError, raw } = await callTool(ctx.client, "woo_products_get", {
      id: 999,
    });
    expect(isError).toBe(true);
    const text = (raw as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toMatch(/Error|invalid|404|not found|Invalid/i);
  });
});
