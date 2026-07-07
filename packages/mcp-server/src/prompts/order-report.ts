/**
 * Prompt template: order-report
 * Summarizes orders by status, revenue, top products for a date range.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerOrderReportPrompt(server: McpServer): void {
  server.registerPrompt(
    "order-report",
    {
      title: "Sales / order report",
      description:
        "Generates a sales report for a given date range: orders by status, revenue totals, and top products. Defaults to the last 30 days when dates are omitted.",
      argsSchema: {
        date_min: z
          .string()
          .optional()
          .describe("Start date YYYY-MM-DD (default: 30 days ago)"),
        date_max: z
          .string()
          .optional()
          .describe("End date YYYY-MM-DD (default: today)"),
        status: z
          .string()
          .optional()
          .describe("Optional order status filter, e.g. completed,processing"),
      },
    },
    ({ date_min, date_max, status }) => {
      const min = date_min || "(30 days ago — compute ISO date)";
      const max = date_max || "(today — compute ISO date)";
      const statusFilter = status || "any relevant statuses";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Generate a WooCommerce sales report for the date range ${min} to ${max}.

Status filter: ${statusFilter}

Steps:
1. Read woo://store/info for currency and store name.
2. Call woo_reports_sales with date_min/date_max (or period if appropriate).
3. Call woo_reports_top_sellers for the same range.
4. Call woo_reports_orders_totals for status distribution.
5. Optionally list recent orders with woo_orders_list (after/before filters, status) for qualitative notes.
6. Summarize:
   - Total revenue and order count
   - Average order value
   - Breakdown by order status
   - Top 5 products by quantity sold
   - Notable anomalies (refunds, failed spikes)

Present results as executive-friendly markdown with bullet KPIs and a short narrative. Do not invent numbers — only use tool results.`,
            },
          },
        ],
      };
    },
  );
}
