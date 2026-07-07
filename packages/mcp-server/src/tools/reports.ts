/**
 * Report tools — sales, top sellers, order totals, customer totals.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import { textContent, WcEntitySchema } from "../types.js";

const DateRangeSchema = {
  date_min: z
    .string()
    .optional()
    .describe("Start date YYYY-MM-DD. Example: 2024-01-01"),
  date_max: z
    .string()
    .optional()
    .describe("End date YYYY-MM-DD. Example: 2024-01-31"),
  period: z
    .enum(["week", "month", "last_month", "year"])
    .optional()
    .describe("Preset period alternative to date_min/date_max"),
};

export function registerReportTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_reports_sales",
    {
      title: "Sales report",
      description:
        "Fetches the WooCommerce sales report for a period or custom date range, including totals, averages, and order counts. Use this for revenue dashboards, period comparisons, or answering “how much did we sell last month?”.",
      inputSchema: DateRangeSchema,
    },
    async (args) => {
      try {
        const res = await client.get("reports/sales", {
          date_min: args.date_min,
          date_max: args.date_max,
          period: args.period,
        });
        const data = Array.isArray(res.data) ? res.data : [res.data];
        return textContent({ report: data });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_reports_top_sellers",
    {
      title: "Top sellers report",
      description:
        "Returns the top-selling products for a period with quantities sold. Use this to identify bestsellers, plan restocks, or build merchandising recommendations.",
      inputSchema: DateRangeSchema,
    },
    async (args) => {
      try {
        const res = await client.get<unknown[]>("reports/top_sellers", {
          date_min: args.date_min,
          date_max: args.date_max,
          period: args.period,
        });
        return textContent({
          items: Array.isArray(res.data) ? res.data : [],
        });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_reports_orders_totals",
    {
      title: "Orders totals report",
      description:
        "Returns order counts grouped by status (pending, processing, completed, etc.). Use this for operational dashboards and backlog visibility without listing every order.",
      inputSchema: {},
    },
    async () => {
      try {
        const res = await client.get<unknown[]>("reports/orders/totals");
        return textContent({
          items: Array.isArray(res.data) ? res.data : [],
        });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_reports_customers_totals",
    {
      title: "Customers totals report",
      description:
        "Returns customer counts by role or segment totals exposed by WooCommerce. Use this for a quick snapshot of the customer base size without paging through all customer records.",
      inputSchema: {},
    },
    async () => {
      try {
        const res = await client.get<unknown[]>("reports/customers/totals");
        return textContent({
          items: Array.isArray(res.data) ? res.data : [],
        });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_reports_products_totals",
    {
      title: "Products totals report",
      description:
        "Returns product counts by type (simple, variable, etc.). Use this for catalog composition analysis and inventory planning at a high level.",
      inputSchema: {},
    },
    async () => {
      try {
        const res = await client.get<unknown[]>("reports/products/totals");
        // validate loosely
        WcEntitySchema.array().or(z.array(z.unknown())).parse(
          Array.isArray(res.data) ? res.data : [],
        );
        return textContent({
          items: Array.isArray(res.data) ? res.data : [],
        });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_reports_coupons_totals",
    {
      title: "Coupons totals report",
      description:
        "Returns coupon usage/count totals from the reports API. Use this to measure promotion adoption without listing every coupon record.",
      inputSchema: {},
    },
    async () => {
      try {
        const res = await client.get<unknown[]>("reports/coupons/totals");
        return textContent({
          items: Array.isArray(res.data) ? res.data : [],
        });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_reports_reviews_totals",
    {
      title: "Reviews totals report",
      description:
        "Returns product review counts by status (approved, hold, spam, etc.). Use this to monitor moderation backlog and review health.",
      inputSchema: {},
    },
    async () => {
      try {
        const res = await client.get<unknown[]>("reports/reviews/totals");
        return textContent({
          items: Array.isArray(res.data) ? res.data : [],
        });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );
}
