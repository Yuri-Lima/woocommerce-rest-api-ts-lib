/**
 * Prompt template: store-audit
 * Audits products for missing images, short descriptions, categories, stock, SEO.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerStoreAuditPrompt(server: McpServer): void {
  server.registerPrompt(
    "store-audit",
    {
      title: "Store product SEO & quality audit",
      description:
        "Guides an audit of catalog products for missing images, empty short descriptions, uncategorized items, zero stock, and basic SEO issues. Use when the user asks to review catalog quality or SEO readiness.",
      argsSchema: {
        sample_size: z
          .string()
          .optional()
          .describe("How many products to sample (default 50). Example: \"50\""),
        focus: z
          .string()
          .optional()
          .describe(
            "Optional focus area: seo, inventory, images, categories, or all",
          ),
      },
    },
    ({ sample_size, focus }) => {
      const size = sample_size || "50";
      const area = focus || "all";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `You are auditing a WooCommerce store catalog for quality and SEO issues.

Focus area: ${area}
Sample size: up to ${size} products

Steps:
1. Read the woo://store/info resource for store context (currency, WC version).
2. Use woo_products_list with per_page appropriate for the sample (paginate if needed).
3. For each product, flag issues:
   - Missing or empty images array
   - Empty or very short short_description (< 20 chars)
   - No categories assigned
   - stock_quantity is 0 or stock_status is outofstock while status is publish
   - Missing or generic name / slug issues (slug equals "product" or empty)
   - description longer than 0 but missing title-like H1 keywords (basic SEO note)
4. Group findings by severity (critical / warning / info).
5. Produce a prioritized action list with product IDs and suggested fixes.
6. Do not modify products unless the user explicitly asks you to apply fixes.

Return a structured markdown report with counts and a table of affected product IDs.`,
            },
          },
        ],
      };
    },
  );
}
