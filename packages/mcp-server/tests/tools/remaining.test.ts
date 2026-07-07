/**
 * Coverage for remaining resource domains (customers → tax).
 */
import nock from "nock";
import {
  apiPath,
  callTool,
  createMcpTestContext,
  TEST_BASE,
} from "../helpers.js";

describe("remaining tool domains", () => {
  let ctx: Awaited<ReturnType<typeof createMcpTestContext>>;

  beforeEach(async () => {
    nock.cleanAll();
    ctx = await createMcpTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe("customers", () => {
    it("list/get/create/update/delete/search", async () => {
      nock(TEST_BASE)
        .get(apiPath("/customers"))
        .query(true)
        .reply(200, [{ id: 12, email: "jane@example.com" }], {
          "x-wp-total": "1",
          "x-wp-totalpages": "1",
        });
      nock(TEST_BASE)
        .get(apiPath("/customers/12"))
        .query(true)
        .reply(200, { id: 12, email: "jane@example.com" });
      nock(TEST_BASE)
        .post(apiPath("/customers"))
        .query(true)
        .reply(201, { id: 13, email: "new@example.com" });
      nock(TEST_BASE)
        .put(apiPath("/customers/13"))
        .query(true)
        .reply(200, { id: 13, first_name: "New" });
      nock(TEST_BASE)
        .delete(apiPath("/customers/13"))
        .query(true)
        .reply(200, { id: 13 });
      nock(TEST_BASE)
        .get(apiPath("/customers"))
        .query((q) => q.search === "jane")
        .reply(200, [{ id: 12 }], {
          "x-wp-total": "1",
          "x-wp-totalpages": "1",
        });

      expect(
        (await callTool(ctx.client, "woo_customers_list")).isError,
      ).toBe(false);
      expect(
        (await callTool(ctx.client, "woo_customers_get", { id: 12 })).data,
      ).toMatchObject({ item: { id: 12 } });
      expect(
        (
          await callTool(ctx.client, "woo_customers_create", {
            email: "new@example.com",
          })
        ).data,
      ).toMatchObject({ item: { id: 13 } });
      expect(
        (
          await callTool(ctx.client, "woo_customers_update", {
            id: 13,
            data: { first_name: "New" },
          })
        ).isError,
      ).toBe(false);
      expect(
        (await callTool(ctx.client, "woo_customers_delete", { id: 13 })).data,
      ).toMatchObject({ deleted: true });
      expect(
        (
          await callTool(ctx.client, "woo_customers_search", { query: "jane" })
        ).isError,
      ).toBe(false);
    });
  });

  describe("coupons", () => {
    it("crud", async () => {
      nock(TEST_BASE)
        .get(apiPath("/coupons"))
        .query(true)
        .reply(200, [{ id: 1, code: "SAVE10" }], {
          "x-wp-total": "1",
          "x-wp-totalpages": "1",
        });
      nock(TEST_BASE)
        .get(apiPath("/coupons/1"))
        .query(true)
        .reply(200, { id: 1, code: "SAVE10" });
      nock(TEST_BASE)
        .post(apiPath("/coupons"))
        .query(true)
        .reply(201, { id: 2, code: "NEW" });
      nock(TEST_BASE)
        .put(apiPath("/coupons/2"))
        .query(true)
        .reply(200, { id: 2, amount: "15" });
      nock(TEST_BASE)
        .delete(apiPath("/coupons/2"))
        .query(true)
        .reply(200, { id: 2 });

      for (const [name, args] of [
        ["woo_coupons_list", {}],
        ["woo_coupons_get", { id: 1 }],
        ["woo_coupons_create", { code: "NEW", amount: "10" }],
        ["woo_coupons_update", { id: 2, data: { amount: "15" } }],
        ["woo_coupons_delete", { id: 2 }],
      ] as const) {
        const r = await callTool(ctx.client, name, args as never);
        expect(r.isError).toBe(false);
      }
    });
  });

  describe("categories & tags", () => {
    it("category and tag crud", async () => {
      nock(TEST_BASE)
        .get(apiPath("/products/categories"))
        .query(true)
        .reply(200, [{ id: 15, name: "Apparel" }], {
          "x-wp-total": "1",
          "x-wp-totalpages": "1",
        });
      nock(TEST_BASE)
        .get(apiPath("/products/categories/15"))
        .query(true)
        .reply(200, { id: 15, name: "Apparel" });
      nock(TEST_BASE)
        .post(apiPath("/products/categories"))
        .query(true)
        .reply(201, { id: 16, name: "Shoes" });
      nock(TEST_BASE)
        .put(apiPath("/products/categories/16"))
        .query(true)
        .reply(200, { id: 16, name: "Footwear" });
      nock(TEST_BASE)
        .delete(apiPath("/products/categories/16"))
        .query(true)
        .reply(200, { id: 16 });

      nock(TEST_BASE)
        .get(apiPath("/products/tags"))
        .query(true)
        .reply(200, [{ id: 3, name: "organic" }], {
          "x-wp-total": "1",
          "x-wp-totalpages": "1",
        });
      nock(TEST_BASE)
        .get(apiPath("/products/tags/3"))
        .query(true)
        .reply(200, { id: 3, name: "organic" });
      nock(TEST_BASE)
        .post(apiPath("/products/tags"))
        .query(true)
        .reply(201, { id: 4, name: "sale" });
      nock(TEST_BASE)
        .put(apiPath("/products/tags/4"))
        .query(true)
        .reply(200, { id: 4, name: "clearance" });
      nock(TEST_BASE)
        .delete(apiPath("/products/tags/4"))
        .query(true)
        .reply(200, { id: 4 });

      for (const name of [
        "woo_categories_list",
        "woo_tags_list",
      ]) {
        expect((await callTool(ctx.client, name)).isError).toBe(false);
      }
      expect(
        (await callTool(ctx.client, "woo_categories_get", { id: 15 })).data,
      ).toMatchObject({ item: { id: 15 } });
      expect(
        (
          await callTool(ctx.client, "woo_categories_create", { name: "Shoes" })
        ).data,
      ).toMatchObject({ item: { id: 16 } });
      expect(
        (
          await callTool(ctx.client, "woo_categories_update", {
            id: 16,
            data: { name: "Footwear" },
          })
        ).isError,
      ).toBe(false);
      expect(
        (await callTool(ctx.client, "woo_categories_delete", { id: 16 })).data,
      ).toMatchObject({ deleted: true });

      expect(
        (await callTool(ctx.client, "woo_tags_get", { id: 3 })).isError,
      ).toBe(false);
      expect(
        (await callTool(ctx.client, "woo_tags_create", { name: "sale" })).data,
      ).toMatchObject({ item: { id: 4 } });
      expect(
        (
          await callTool(ctx.client, "woo_tags_update", {
            id: 4,
            data: { name: "clearance" },
          })
        ).isError,
      ).toBe(false);
      expect(
        (await callTool(ctx.client, "woo_tags_delete", { id: 4 })).data,
      ).toMatchObject({ deleted: true });
    });
  });

  describe("variations", () => {
    it("crud under product", async () => {
      nock(TEST_BASE)
        .get(apiPath("/products/1/variations"))
        .query(true)
        .reply(200, [{ id: 50, sku: "V1" }], {
          "x-wp-total": "1",
          "x-wp-totalpages": "1",
        });
      nock(TEST_BASE)
        .get(apiPath("/products/1/variations/50"))
        .query(true)
        .reply(200, { id: 50, sku: "V1" });
      nock(TEST_BASE)
        .post(apiPath("/products/1/variations"))
        .query(true)
        .reply(201, { id: 51, regular_price: "10" });
      nock(TEST_BASE)
        .put(apiPath("/products/1/variations/51"))
        .query(true)
        .reply(200, { id: 51, regular_price: "12" });
      nock(TEST_BASE)
        .delete(apiPath("/products/1/variations/51"))
        .query(true)
        .reply(200, { id: 51 });

      expect(
        (
          await callTool(ctx.client, "woo_variations_list", { product_id: 1 })
        ).isError,
      ).toBe(false);
      expect(
        (
          await callTool(ctx.client, "woo_variations_get", {
            product_id: 1,
            id: 50,
          })
        ).data,
      ).toMatchObject({ item: { id: 50 } });
      expect(
        (
          await callTool(ctx.client, "woo_variations_create", {
            product_id: 1,
            data: { regular_price: "10" },
          })
        ).data,
      ).toMatchObject({ item: { id: 51 } });
      expect(
        (
          await callTool(ctx.client, "woo_variations_update", {
            product_id: 1,
            id: 51,
            data: { regular_price: "12" },
          })
        ).isError,
      ).toBe(false);
      expect(
        (
          await callTool(ctx.client, "woo_variations_delete", {
            product_id: 1,
            id: 51,
          })
        ).data,
      ).toMatchObject({ deleted: true });
    });
  });

  describe("shipping & payments", () => {
    it("lists zones methods classes and gateways", async () => {
      nock(TEST_BASE)
        .get(apiPath("/shipping/zones"))
        .query(true)
        .reply(200, [{ id: 1, name: "US" }]);
      nock(TEST_BASE)
        .get(apiPath("/shipping/zones/1"))
        .query(true)
        .reply(200, { id: 1, name: "US" });
      nock(TEST_BASE)
        .get(apiPath("/shipping/zones/1/methods"))
        .query(true)
        .reply(200, [{ id: 3, method_id: "flat_rate" }]);
      nock(TEST_BASE)
        .get(apiPath("/shipping_methods"))
        .query(true)
        .reply(200, [{ id: "flat_rate" }]);
      nock(TEST_BASE)
        .get(apiPath("/products/shipping_classes"))
        .query(true)
        .reply(200, [{ id: 7, name: "Bulky" }], {
          "x-wp-total": "1",
          "x-wp-totalpages": "1",
        });
      nock(TEST_BASE)
        .get(apiPath("/products/shipping_classes/7"))
        .query(true)
        .reply(200, { id: 7, name: "Bulky" });
      nock(TEST_BASE)
        .get(apiPath("/payment_gateways"))
        .query(true)
        .reply(200, [{ id: "bacs", title: "BACS" }]);
      nock(TEST_BASE)
        .get(apiPath("/payment_gateways/bacs"))
        .query(true)
        .reply(200, { id: "bacs", enabled: true });
      nock(TEST_BASE)
        .put(apiPath("/payment_gateways/bacs"))
        .query(true)
        .reply(200, { id: "bacs", enabled: false });

      for (const [name, args] of [
        ["woo_shipping_zones_list", {}],
        ["woo_shipping_zones_get", { id: 1 }],
        ["woo_shipping_zone_methods_list", { zone_id: 1 }],
        ["woo_shipping_methods_list", {}],
        ["woo_shipping_classes_list", {}],
        ["woo_shipping_classes_get", { id: 7 }],
        ["woo_payments_list", {}],
        ["woo_payments_get", { id: "bacs" }],
        ["woo_payments_update", { id: "bacs", data: { enabled: false } }],
      ] as const) {
        const r = await callTool(ctx.client, name, args as never);
        expect(r.isError).toBe(false);
      }
    });
  });

  describe("reports settings system webhooks tax", () => {
    it("covers reports and settings and system and webhooks and tax", async () => {
      nock(TEST_BASE)
        .get(apiPath("/reports/sales"))
        .query(true)
        .reply(200, [{ total_sales: "100.00" }]);
      nock(TEST_BASE)
        .get(apiPath("/reports/top_sellers"))
        .query(true)
        .reply(200, [{ name: "Blue T-Shirt", quantity: 5 }]);
      nock(TEST_BASE)
        .get(apiPath("/reports/orders/totals"))
        .query(true)
        .reply(200, [{ slug: "completed", total: 3 }]);
      nock(TEST_BASE)
        .get(apiPath("/reports/customers/totals"))
        .query(true)
        .reply(200, [{ slug: "customer", total: 10 }]);
      nock(TEST_BASE)
        .get(apiPath("/reports/products/totals"))
        .query(true)
        .reply(200, [{ slug: "simple", total: 8 }]);
      nock(TEST_BASE)
        .get(apiPath("/reports/coupons/totals"))
        .query(true)
        .reply(200, [{ slug: "percent", total: 2 }]);
      nock(TEST_BASE)
        .get(apiPath("/reports/reviews/totals"))
        .query(true)
        .reply(200, [{ slug: "approved", total: 4 }]);

      nock(TEST_BASE)
        .get(apiPath("/settings"))
        .query(true)
        .reply(200, [{ id: "general", label: "General" }]);
      nock(TEST_BASE)
        .get(apiPath("/settings/general"))
        .query(true)
        .reply(200, [
          { id: "woocommerce_currency", value: "USD" },
        ]);
      nock(TEST_BASE)
        .get(apiPath("/settings/general/woocommerce_currency"))
        .query(true)
        .reply(200, { id: "woocommerce_currency", value: "USD" });
      nock(TEST_BASE)
        .put(apiPath("/settings/general/woocommerce_currency"))
        .query(true)
        .reply(200, { id: "woocommerce_currency", value: "EUR" });

      nock(TEST_BASE)
        .get(apiPath("/system_status"))
        .query(true)
        .reply(200, {
          environment: { version: "9.0.0", wp_version: "6.5", php_version: "8.2" },
          settings: { currency: "USD" },
        });
      nock(TEST_BASE)
        .get(apiPath("/system_status/tools"))
        .query(true)
        .reply(200, [{ id: "clear_transients", name: "Clear transients" }]);
      nock(TEST_BASE)
        .put(apiPath("/system_status/tools/clear_transients"))
        .query(true)
        .reply(200, { id: "clear_transients", success: true });

      nock(TEST_BASE)
        .get(apiPath("/webhooks"))
        .query(true)
        .reply(200, [{ id: 1, topic: "order.created" }], {
          "x-wp-total": "1",
          "x-wp-totalpages": "1",
        });
      nock(TEST_BASE)
        .get(apiPath("/webhooks/1"))
        .query(true)
        .reply(200, { id: 1, topic: "order.created" });
      nock(TEST_BASE)
        .post(apiPath("/webhooks"))
        .query(true)
        .reply(201, { id: 2, topic: "product.updated" });
      nock(TEST_BASE)
        .put(apiPath("/webhooks/2"))
        .query(true)
        .reply(200, { id: 2, status: "paused" });
      nock(TEST_BASE)
        .delete(apiPath("/webhooks/2"))
        .query(true)
        .reply(200, { id: 2 });

      nock(TEST_BASE)
        .get(apiPath("/taxes"))
        .query(true)
        .reply(200, [{ id: 1, rate: "8.5" }], {
          "x-wp-total": "1",
          "x-wp-totalpages": "1",
        });
      nock(TEST_BASE)
        .get(apiPath("/taxes/1"))
        .query(true)
        .reply(200, { id: 1, rate: "8.5" });
      nock(TEST_BASE)
        .post(apiPath("/taxes"))
        .query(true)
        .reply(201, { id: 2, rate: "5" });
      nock(TEST_BASE)
        .put(apiPath("/taxes/2"))
        .query(true)
        .reply(200, { id: 2, rate: "6" });
      nock(TEST_BASE)
        .delete(apiPath("/taxes/2"))
        .query(true)
        .reply(200, { id: 2 });
      nock(TEST_BASE)
        .get(apiPath("/taxes/classes"))
        .query(true)
        .reply(200, [{ slug: "standard", name: "Standard" }]);
      nock(TEST_BASE)
        .get(apiPath("/taxes/classes/reduced-rate"))
        .query(true)
        .reply(200, { slug: "reduced-rate", name: "Reduced rate" });

      const tools: Array<[string, Record<string, unknown>?]> = [
        ["woo_reports_sales", { period: "month" }],
        ["woo_reports_top_sellers", {}],
        ["woo_reports_orders_totals", {}],
        ["woo_reports_customers_totals", {}],
        ["woo_reports_products_totals", {}],
        ["woo_reports_coupons_totals", {}],
        ["woo_reports_reviews_totals", {}],
        ["woo_settings_groups_list", {}],
        ["woo_settings_list", { group: "general" }],
        ["woo_settings_get", { group: "general", id: "woocommerce_currency" }],
        [
          "woo_settings_update",
          { group: "general", id: "woocommerce_currency", value: "EUR" },
        ],
        ["woo_system_status_get", {}],
        ["woo_system_status_tools_list", {}],
        ["woo_system_status_tools_run", { id: "clear_transients" }],
        ["woo_webhooks_list", {}],
        ["woo_webhooks_get", { id: 1 }],
        [
          "woo_webhooks_create",
          {
            topic: "product.updated",
            delivery_url: "https://hooks.example/wc",
          },
        ],
        ["woo_webhooks_update", { id: 2, data: { status: "paused" } }],
        ["woo_webhooks_delete", { id: 2 }],
        ["woo_tax_rates_list", {}],
        ["woo_tax_rates_get", { id: 1 }],
        ["woo_tax_rates_create", { rate: "5", country: "US" }],
        ["woo_tax_rates_update", { id: 2, data: { rate: "6" } }],
        ["woo_tax_rates_delete", { id: 2 }],
        ["woo_tax_classes_list", {}],
        ["woo_tax_classes_get", { slug: "reduced-rate" }],
      ];

      for (const [name, args] of tools) {
        const r = await callTool(ctx.client, name, args ?? {});
        expect(r.isError).toBe(false);
      }
    });
  });
});
