/**
 * Registers all MCP tools, resources, and prompts on the server instance.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "./client.js";

import { registerProductTools } from "./tools/products.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerCustomerTools } from "./tools/customers.js";
import { registerCouponTools } from "./tools/coupons.js";
import { registerCategoryTools } from "./tools/categories.js";
import { registerTagTools } from "./tools/tags.js";
import { registerVariationTools } from "./tools/variations.js";
import { registerShippingTools } from "./tools/shipping.js";
import { registerPaymentTools } from "./tools/payments.js";
import { registerReportTools } from "./tools/reports.js";
import { registerSettingsTools } from "./tools/settings.js";
import { registerSystemStatusTools } from "./tools/system-status.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerTaxTools } from "./tools/tax.js";
import { registerReviewTools } from "./tools/reviews.js";
import { registerUsageTools } from "./tools/usage.js";

import { registerStoreInfoResource } from "./resources/store-info.js";
import { registerApiSchemaResource } from "./resources/api-schema.js";

import { registerStoreAuditPrompt } from "./prompts/store-audit.js";
import { registerOrderReportPrompt } from "./prompts/order-report.js";
import { registerInventoryCheckPrompt } from "./prompts/inventory-check.js";

/**
 * Catalog of tool domains for documentation / UI.
 */
export const TOOL_DOMAINS = [
  "products",
  "orders",
  "customers",
  "coupons",
  "categories",
  "tags",
  "variations",
  "shipping",
  "payments",
  "reports",
  "settings",
  "system-status",
  "webhooks",
  "tax",
  "reviews",
  "usage",
] as const;

export type ToolDomain = (typeof TOOL_DOMAINS)[number];

/**
 * Auto-register every tool, resource, and prompt.
 */
export function registerAll(server: McpServer, client: WooClient): void {
  // Tools
  registerProductTools(server, client);
  registerOrderTools(server, client);
  registerCustomerTools(server, client);
  registerCouponTools(server, client);
  registerCategoryTools(server, client);
  registerTagTools(server, client);
  registerVariationTools(server, client);
  registerShippingTools(server, client);
  registerPaymentTools(server, client);
  registerReportTools(server, client);
  registerSettingsTools(server, client);
  registerSystemStatusTools(server, client);
  registerWebhookTools(server, client);
  registerTaxTools(server, client);
  registerReviewTools(server, client);
  registerUsageTools(server);

  // Resources
  registerStoreInfoResource(server, client);
  registerApiSchemaResource(server, client);

  // Prompts
  registerStoreAuditPrompt(server);
  registerOrderReportPrompt(server);
  registerInventoryCheckPrompt(server);
}
