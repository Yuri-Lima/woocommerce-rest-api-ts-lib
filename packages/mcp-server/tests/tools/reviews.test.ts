import nock from "nock";
import {
  apiPath,
  callTool,
  createMcpTestContext,
  TEST_BASE,
} from "../helpers.js";

describe("review tools", () => {
  let ctx: Awaited<ReturnType<typeof createMcpTestContext>>;

  beforeEach(async () => {
    nock.cleanAll();
    ctx = await createMcpTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it("woo_reviews_list / get / create / update / delete", async () => {
    nock(TEST_BASE)
      .get(apiPath("/products/reviews"))
      .query(true)
      .reply(
        200,
        [
          {
            id: 9,
            product_id: 1,
            status: "approved",
            reviewer: "Jane",
            rating: 5,
          },
        ],
        { "x-wp-total": "1", "x-wp-totalpages": "1" },
      );
    nock(TEST_BASE)
      .get(apiPath("/products/reviews/9"))
      .query(true)
      .reply(200, {
        id: 9,
        product_id: 1,
        status: "approved",
        reviewer: "Jane",
        rating: 5,
      });
    nock(TEST_BASE)
      .post(apiPath("/products/reviews"))
      .query(true)
      .reply(201, {
        id: 10,
        product_id: 1,
        status: "hold",
        reviewer: "Bob",
        rating: 4,
      });
    nock(TEST_BASE)
      .put(apiPath("/products/reviews/10"))
      .query(true)
      .reply(200, {
        id: 10,
        product_id: 1,
        status: "approved",
        reviewer: "Bob",
        rating: 4,
      });
    nock(TEST_BASE)
      .delete(apiPath("/products/reviews/10"))
      .query(true)
      .reply(200, { id: 10 });

    const list = await callTool(ctx.client, "woo_reviews_list", {
      page: 1,
      per_page: 10,
      status: "approved",
    });
    expect(list.isError).toBe(false);
    expect((list.data as { items: unknown[] }).items[0]).toMatchObject({
      id: 9,
    });

    expect(
      (await callTool(ctx.client, "woo_reviews_get", { id: 9 })).data,
    ).toMatchObject({ item: { id: 9 } });

    expect(
      (
        await callTool(ctx.client, "woo_reviews_create", {
          product_id: 1,
          review: "Great product",
          reviewer: "Bob",
          reviewer_email: "bob@example.com",
          rating: 4,
          status: "hold",
        })
      ).data,
    ).toMatchObject({ item: { id: 10 } });

    expect(
      (
        await callTool(ctx.client, "woo_reviews_update", {
          id: 10,
          data: { status: "approved" },
        })
      ).data,
    ).toMatchObject({ item: { status: "approved" } });

    expect(
      (await callTool(ctx.client, "woo_reviews_delete", { id: 10, force: true }))
        .data,
    ).toMatchObject({ deleted: true });
  });
});
