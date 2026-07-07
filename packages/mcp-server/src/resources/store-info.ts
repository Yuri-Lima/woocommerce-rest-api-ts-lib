/**
 * MCP resource: woo://store/info
 * Read-only store context (name, currency, timezone, WC version).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { normalizeError } from "../errors.js";

export const STORE_INFO_URI = "woo://store/info";

export function registerStoreInfoResource(
  server: McpServer,
  client: WooClient,
): void {
  server.registerResource(
    "store-info",
    STORE_INFO_URI,
    {
      title: "WooCommerce store info",
      description:
        "Read-only snapshot of the connected store: name, URL, currency, timezone, weight/dimension units, and WooCommerce version from system status / settings. Use this as grounding context before making catalog or order changes.",
      mimeType: "application/json",
    },
    async (uri) => {
      try {
        const [statusRes, generalRes] = await Promise.all([
          client.get<Record<string, unknown>>("system_status"),
          client.get<Array<Record<string, unknown>>>("settings/general"),
        ]);

        const env = (statusRes.data?.environment ?? {}) as Record<
          string,
          unknown
        >;
        const settings = (statusRes.data?.settings ?? {}) as Record<
          string,
          unknown
        >;
        const general = Array.isArray(generalRes.data) ? generalRes.data : [];

        const findSetting = (id: string) =>
          general.find((s) => s.id === id)?.value;

        const info = {
          url: client.config.WC_URL,
          name:
            findSetting("woocommerce_store_address") ||
            settings.store_id ||
            "WooCommerce Store",
          currency:
            findSetting("woocommerce_currency") ||
            settings.currency ||
            null,
          currency_symbol: settings.currency_symbol ?? null,
          timezone:
            env.default_timezone ||
            findSetting("woocommerce_default_customer_address") ||
            null,
          weight_unit: settings.weight_unit ?? findSetting("woocommerce_weight_unit") ?? null,
          dimension_unit:
            settings.dimension_unit ??
            findSetting("woocommerce_dimension_unit") ??
            null,
          woocommerce_version: env.version ?? null,
          wordpress_version: env.wp_version ?? null,
          php_version: env.php_version ?? null,
          api_version: client.config.WC_VERSION,
        };

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(info, null, 2),
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
              text: JSON.stringify({ error: n }, null, 2),
            },
          ],
        };
      }
    },
  );
}
