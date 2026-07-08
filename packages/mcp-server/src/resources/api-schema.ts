/**
 * MCP resource: woo://api/schema
 * Exposes available WC REST API endpoints and parameters as context for the model.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { normalizeError } from "../errors.js";

export const API_SCHEMA_URI = "woo://api/schema";

/** Static schema map describing the tools/endpoints this MCP server exposes. */
export const WC_API_SCHEMA = {
  version: "wc/v3",
  description:
    "WooCommerce REST API surface wrapped by woo-mcp-server tools. Prefer purpose-built tools over inventing raw paths.",
  endpoints: [
    {
      resource: "products",
      path: "/products",
      methods: ["GET", "POST", "PUT", "DELETE"],
      batch: "/products/batch",
      search_param: "search",
      tools: [
        "woo_products_list",
        "woo_products_get",
        "woo_products_create",
        "woo_products_update",
        "woo_products_delete",
        "woo_products_search",
        "woo_products_batch",
      ],
    },
    {
      resource: "orders",
      path: "/orders",
      methods: ["GET", "POST", "PUT", "DELETE"],
      batch: "/orders/batch",
      notes: "/orders/{id}/notes",
      refunds: "/orders/{id}/refunds",
      filters: ["status", "customer", "after", "before", "product"],
      tools: [
        "woo_orders_list",
        "woo_orders_get",
        "woo_orders_create",
        "woo_orders_update",
        "woo_orders_delete",
        "woo_orders_notes_list",
        "woo_orders_notes_create",
        "woo_orders_batch",
        "woo_orders_refunds_list",
        "woo_orders_refunds_get",
        "woo_orders_refunds_create",
        "woo_orders_refunds_delete",
      ],
    },
    {
      resource: "reviews",
      path: "/products/reviews",
      methods: ["GET", "POST", "PUT", "DELETE"],
      filters: ["product", "status", "reviewer"],
      tools: [
        "woo_reviews_list",
        "woo_reviews_get",
        "woo_reviews_create",
        "woo_reviews_update",
        "woo_reviews_delete",
      ],
    },
    {
      resource: "usage",
      path: null,
      methods: [],
      description:
        "Session usage: estimated tool-response tokens on every tool result, plus recorded host model (LLM) token totals.",
      tools: ["woo_usage_stats", "woo_model_usage_record"],
    },
    {
      resource: "customers",
      path: "/customers",
      methods: ["GET", "POST", "PUT", "DELETE"],
      search_param: "search",
      tools: [
        "woo_customers_list",
        "woo_customers_get",
        "woo_customers_create",
        "woo_customers_update",
        "woo_customers_delete",
        "woo_customers_search",
      ],
    },
    {
      resource: "coupons",
      path: "/coupons",
      methods: ["GET", "POST", "PUT", "DELETE"],
      tools: [
        "woo_coupons_list",
        "woo_coupons_get",
        "woo_coupons_create",
        "woo_coupons_update",
        "woo_coupons_delete",
      ],
    },
    {
      resource: "categories",
      path: "/products/categories",
      methods: ["GET", "POST", "PUT", "DELETE"],
      tools: [
        "woo_categories_list",
        "woo_categories_get",
        "woo_categories_create",
        "woo_categories_update",
        "woo_categories_delete",
      ],
    },
    {
      resource: "tags",
      path: "/products/tags",
      methods: ["GET", "POST", "PUT", "DELETE"],
      tools: [
        "woo_tags_list",
        "woo_tags_get",
        "woo_tags_create",
        "woo_tags_update",
        "woo_tags_delete",
      ],
    },
    {
      resource: "variations",
      path: "/products/{product_id}/variations",
      methods: ["GET", "POST", "PUT", "DELETE"],
      tools: [
        "woo_variations_list",
        "woo_variations_get",
        "woo_variations_create",
        "woo_variations_update",
        "woo_variations_delete",
      ],
    },
    {
      resource: "shipping",
      paths: [
        "/shipping/zones",
        "/shipping/zones/{id}/methods",
        "/shipping_methods",
        "/products/shipping_classes",
      ],
      tools: [
        "woo_shipping_zones_list",
        "woo_shipping_zones_get",
        "woo_shipping_zone_methods_list",
        "woo_shipping_methods_list",
        "woo_shipping_classes_list",
        "woo_shipping_classes_get",
      ],
    },
    {
      resource: "payments",
      path: "/payment_gateways",
      methods: ["GET", "PUT"],
      tools: ["woo_payments_list", "woo_payments_get", "woo_payments_update"],
    },
    {
      resource: "reports",
      paths: [
        "/reports/sales",
        "/reports/top_sellers",
        "/reports/orders/totals",
        "/reports/customers/totals",
        "/reports/products/totals",
        "/reports/coupons/totals",
        "/reports/reviews/totals",
      ],
      tools: [
        "woo_reports_sales",
        "woo_reports_top_sellers",
        "woo_reports_orders_totals",
        "woo_reports_customers_totals",
        "woo_reports_products_totals",
        "woo_reports_coupons_totals",
        "woo_reports_reviews_totals",
      ],
    },
    {
      resource: "settings",
      path: "/settings",
      methods: ["GET", "PUT"],
      tools: [
        "woo_settings_groups_list",
        "woo_settings_list",
        "woo_settings_get",
        "woo_settings_update",
      ],
    },
    {
      resource: "system_status",
      path: "/system_status",
      tools: [
        "woo_system_status_get",
        "woo_system_status_tools_list",
        "woo_system_status_tools_run",
      ],
    },
    {
      resource: "webhooks",
      path: "/webhooks",
      methods: ["GET", "POST", "PUT", "DELETE"],
      tools: [
        "woo_webhooks_list",
        "woo_webhooks_get",
        "woo_webhooks_create",
        "woo_webhooks_update",
        "woo_webhooks_delete",
      ],
    },
    {
      resource: "tax",
      paths: ["/taxes", "/taxes/classes"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      tools: [
        "woo_tax_rates_list",
        "woo_tax_rates_get",
        "woo_tax_rates_create",
        "woo_tax_rates_update",
        "woo_tax_rates_delete",
        "woo_tax_classes_list",
        "woo_tax_classes_get",
      ],
    },
  ],
  pagination: {
    params: ["page", "per_page"],
    headers: ["x-wp-total", "x-wp-totalpages"],
  },
  authentication: "OAuth 1.0a (HTTP) or Basic Auth over HTTPS with consumer key/secret",
};

export function registerApiSchemaResource(
  server: McpServer,
  client: WooClient,
): void {
  server.registerResource(
    "api-schema",
    API_SCHEMA_URI,
    {
      title: "WooCommerce REST API schema",
      description:
        "Documents the WooCommerce REST endpoints and corresponding MCP tools available in this server. Helps the model choose the correct tool instead of inventing raw API paths.",
      mimeType: "application/json",
    },
    async (uri) => {
      try {
        // Optionally enrich with live OPTIONS on products when available
        let live: unknown = null;
        try {
          const opt = await client.api.options("products");
          live = opt.data;
        } catch {
          // live schema optional — static schema is always returned
        }

        const payload = {
          ...WC_API_SCHEMA,
          store_url: client.config.WC_URL,
          live_products_options: live,
        };

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(payload, null, 2),
            },
          ],
        };
      } catch (err) {
        const n = normalizeError(err);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: n, static: WC_API_SCHEMA }, null, 2),
            },
          ],
        };
      }
    },
  );
}
