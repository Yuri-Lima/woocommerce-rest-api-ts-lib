import nock from "nock";
import orders from "../fixtures/orders.json";
import {
  apiPath,
  callTool,
  createMcpTestContext,
  TEST_BASE,
} from "../helpers.js";

describe("order tools", () => {
  let ctx: Awaited<ReturnType<typeof createMcpTestContext>>;

  beforeEach(async () => {
    nock.cleanAll();
    ctx = await createMcpTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it("woo_orders_list filters by status and customer", async () => {
    nock(TEST_BASE)
      .get(apiPath("/orders"))
      .query((q) => q.status === "processing" && q.customer === "12")
      .reply(200, orders, {
        "x-wp-total": "1",
        "x-wp-totalpages": "1",
      });

    const { data, isError } = await callTool(ctx.client, "woo_orders_list", {
      status: "processing",
      customer: 12,
      page: 1,
      per_page: 10,
    });
    expect(isError).toBe(false);
    expect((data as { items: unknown[] }).items[0]).toMatchObject({ id: 101 });
    expect(data).toMatchObject({
      pagination: { total: 1, currentPage: 1 },
    });
  });

  it("woo_orders_get / create / update / delete", async () => {
    nock(TEST_BASE).get(apiPath("/orders/101")).query(true).reply(200, orders[0]);
    nock(TEST_BASE)
      .post(apiPath("/orders"))
      .query(true)
      .reply(201, { id: 200, status: "pending" });
    nock(TEST_BASE)
      .put(apiPath("/orders/200"))
      .query(true)
      .reply(200, { id: 200, status: "completed" });
    nock(TEST_BASE)
      .delete(apiPath("/orders/200"))
      .query(true)
      .reply(200, { id: 200 });

    expect(
      (await callTool(ctx.client, "woo_orders_get", { id: 101 })).data,
    ).toMatchObject({ item: { id: 101 } });

    expect(
      (
        await callTool(ctx.client, "woo_orders_create", {
          status: "pending",
          line_items: [{ product_id: 1, quantity: 1 }],
        })
      ).data,
    ).toMatchObject({ item: { id: 200 } });

    expect(
      (
        await callTool(ctx.client, "woo_orders_update", {
          id: 200,
          data: { status: "completed" },
        })
      ).data,
    ).toMatchObject({ item: { status: "completed" } });

    expect(
      (await callTool(ctx.client, "woo_orders_delete", { id: 200 })).data,
    ).toMatchObject({ deleted: true });
  });

  it("order notes list and create", async () => {
    nock(TEST_BASE)
      .get(apiPath("/orders/101/notes"))
      .query(true)
      .reply(200, [{ id: 1, note: "Hello" }], {
        "x-wp-total": "1",
        "x-wp-totalpages": "1",
      });
    nock(TEST_BASE)
      .post(apiPath("/orders/101/notes"))
      .query(true)
      .reply(201, { id: 2, note: "Shipped" });

    const list = await callTool(ctx.client, "woo_orders_notes_list", {
      order_id: 101,
    });
    expect(list.isError).toBe(false);
    expect((list.data as { items: unknown[] }).items).toHaveLength(1);

    const created = await callTool(ctx.client, "woo_orders_notes_create", {
      order_id: 101,
      note: "Shipped",
      customer_note: true,
    });
    expect(created.data).toMatchObject({ item: { id: 2 } });
  });

  it("woo_orders_batch", async () => {
    nock(TEST_BASE)
      .post(apiPath("/orders/batch"))
      .query(true)
      .reply(200, { update: [{ id: 101, status: "completed" }] });

    const { data, isError } = await callTool(ctx.client, "woo_orders_batch", {
      update: [{ id: 101, status: "completed" }],
    });
    expect(isError).toBe(false);
    expect(data).toMatchObject({ update: [{ id: 101 }] });
  });

  it("supports date range filters", async () => {
    nock(TEST_BASE)
      .get(apiPath("/orders"))
      .query((q) => Boolean(q.after) && Boolean(q.before))
      .reply(200, orders, { "x-wp-total": "1", "x-wp-totalpages": "1" });

    const { isError } = await callTool(ctx.client, "woo_orders_list", {
      after: "2024-01-01T00:00:00",
      before: "2024-12-31T23:59:59",
    });
    expect(isError).toBe(false);
  });
});
