/**
 * Prompt template: inventory-check
 * Finds products below a stock threshold, groups by category, suggests reorder qty.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerInventoryCheckPrompt(server: McpServer): void {
  server.registerPrompt(
    "inventory-check",
    {
      title: "Low-stock inventory check",
      description:
        "Finds products with stock below a threshold, groups them by category, and suggests reorder quantities. Use for replenishment planning and stock-out prevention.",
      argsSchema: {
        threshold: z
          .string()
          .optional()
          .describe("Stock quantity threshold (default 5). Example: \"5\""),
        include_outofstock: z
          .string()
          .optional()
          .describe("Whether to include outofstock items: true|false (default true)"),
      },
    },
    ({ threshold, include_outofstock }) => {
      const thr = threshold || "5";
      const includeOoS = include_outofstock ?? "true";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Perform a low-stock inventory check for this WooCommerce store.

Threshold: stock_quantity < ${thr} (or null with manage_stock)
Include out-of-stock products: ${includeOoS}

Steps:
1. Use woo_products_list with stock_status filters and paginate through results (per_page=50).
2. Also fetch categories with woo_categories_list for grouping labels.
3. Filter products where manage_stock is true and stock_quantity is below ${thr}, plus outofstock if requested.
4. For variable products, use woo_variations_list when parent stock is not authoritative.
5. Group low-stock items by primary category name.
6. Suggest a reorder quantity per SKU: max(${thr} * 2 - current_stock, ${thr}) unless historical sales data is available from woo_reports_top_sellers to refine.
7. Produce a markdown table: SKU | Name | Category | Stock | Suggested reorder | Product ID.

Do not change stock levels unless the user explicitly asks to update products.`,
            },
          },
        ],
      };
    },
  );
}
