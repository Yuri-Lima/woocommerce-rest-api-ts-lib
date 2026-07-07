/**
 * Environment-based configuration for the WooCommerce MCP server.
 * Validates required credentials at startup — no silent fallbacks.
 */

import { z } from "zod";

/**
 * Zod schema for MCP server environment configuration.
 * WC_URL, WC_KEY, and WC_SECRET are mandatory; the server refuses to start without them.
 */
export const ConfigSchema = z.object({
  WC_URL: z
    .string({ required_error: "WC_URL is required" })
    .url("WC_URL must be a valid URL (e.g. https://mystore.com)")
    .describe("Base URL of the WooCommerce store"),
  WC_KEY: z
    .string({ required_error: "WC_KEY is required" })
    .min(1, "WC_KEY cannot be empty")
    .describe("WooCommerce REST API consumer key (ck_...)"),
  WC_SECRET: z
    .string({ required_error: "WC_SECRET is required" })
    .min(1, "WC_SECRET cannot be empty")
    .describe("WooCommerce REST API consumer secret (cs_...)"),
  WC_VERSION: z
    .string()
    .default("wc/v3")
    .describe("WooCommerce REST API version prefix"),
  WC_RATE_LIMIT_PER_SECOND: z.coerce
    .number()
    .int()
    .positive()
    .default(5)
    .describe("Max outgoing WC API requests per second (default 5)"),
  WC_QUERY_STRING_AUTH: z
    .enum(["true", "false", "1", "0", ""])
    .optional()
    .transform((v) => v === "true" || v === "1")
    .describe("Use query-string auth instead of Basic Auth over HTTPS"),
});

export type McpConfig = z.infer<typeof ConfigSchema>;

const MISSING_ENV_HELP = `
WooCommerce MCP Server configuration error.

Required environment variables:
  WC_URL     — Store base URL, e.g. https://mystore.com
  WC_KEY     — REST API consumer key (WooCommerce → Settings → Advanced → REST API)
  WC_SECRET  — REST API consumer secret

Optional:
  WC_VERSION                 — API version (default: wc/v3)
  WC_RATE_LIMIT_PER_SECOND   — Max requests/sec (default: 5)
  WC_QUERY_STRING_AUTH       — "true" to pass credentials as query params

Example (Claude Desktop config):
  {
    "mcpServers": {
      "woocommerce": {
        "command": "npx",
        "args": ["woo-mcp-server"],
        "env": {
          "WC_URL": "https://mystore.com",
          "WC_KEY": "ck_xxxxxxxx",
          "WC_SECRET": "cs_xxxxxxxx"
        }
      }
    }
  }
`.trim();

/**
 * Load and validate config from process.env.
 * Throws a clear, actionable error if required vars are missing.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const result = ConfigSchema.safeParse({
    WC_URL: env.WC_URL,
    WC_KEY: env.WC_KEY,
    WC_SECRET: env.WC_SECRET,
    WC_VERSION: env.WC_VERSION,
    WC_RATE_LIMIT_PER_SECOND: env.WC_RATE_LIMIT_PER_SECOND ?? "5",
    WC_QUERY_STRING_AUTH: env.WC_QUERY_STRING_AUTH ?? "",
  });

  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`${MISSING_ENV_HELP}\n\nValidation issues:\n${details}`);
  }

  return result.data;
}
