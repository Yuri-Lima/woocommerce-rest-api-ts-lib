/**
 * System status tools — store health, environment, database, plugins.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import { textContent, WcEntitySchema } from "../types.js";

const SystemStatusSchema = z
  .object({
    environment: z.record(z.unknown()).optional(),
    database: z.record(z.unknown()).optional(),
    active_plugins: z.array(z.unknown()).optional(),
    theme: z.record(z.unknown()).optional(),
    settings: z.record(z.unknown()).optional(),
    security: z.record(z.unknown()).optional(),
    pages: z.array(z.unknown()).optional(),
  })
  .passthrough();

export function registerSystemStatusTools(
  server: McpServer,
  client: WooClient,
): void {
  server.registerTool(
    "woo_system_status_get",
    {
      title: "Get system status",
      description:
        "Fetches the full WooCommerce system status report including environment (PHP, WordPress, WC version), database, active plugins, theme, and security flags. Use this for store health checks, debugging plugin conflicts, or verifying the runtime before bulk operations.",
      inputSchema: {},
    },
    async () => {
      try {
        const res = await client.get("system_status");
        const parsed = SystemStatusSchema.parse(res.data ?? {});
        return textContent({ item: parsed });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_system_status_tools_list",
    {
      title: "List system status tools",
      description:
        "Lists available WooCommerce system tools (clear transients, recount terms, regenerate thumbnails, etc.). Use this to discover maintenance actions before running one.",
      inputSchema: {},
    },
    async () => {
      try {
        const res = await client.get<unknown[]>("system_status/tools");
        const items = Array.isArray(res.data) ? res.data : [];
        WcEntitySchema.array().parse(items.length ? items : [{ id: 0 }]);
        return textContent({ items });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_system_status_tools_run",
    {
      title: "Run system status tool",
      description:
        "Runs a WooCommerce system maintenance tool by ID (e.g. clear_transients). Use this only when the user explicitly requests a maintenance action — these can be destructive or slow on large stores.",
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe("Tool ID. Example: clear_transients"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(`system_status/tools/${args.id}`, {
          confirm: true,
        });
        return textContent({ item: res.data });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );
}
