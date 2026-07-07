/**
 * Settings tools — list groups, get/update options.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import {
  PaginationInputSchema,
  WcEntitySchema,
  parseListOutput,
  parseSingleOutput,
  textContent,
} from "../types.js";

export function registerSettingsTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_settings_groups_list",
    {
      title: "List settings groups",
      description:
        "Lists WooCommerce settings groups (general, products, tax, shipping, checkout, account, email, advanced, etc.). Use this to discover which setting groups exist before reading or updating options.",
      inputSchema: {
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 100;
        const res = await client.get<unknown[]>("settings", { page, per_page });
        const meta = client.pagination(res, page, per_page);
        const items = Array.isArray(res.data) ? res.data : [];
        return textContent(
          parseListOutput(
            items,
            meta.currentPage,
            meta.perPage,
            meta.total || items.length,
            meta.totalPages,
            WcEntitySchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_settings_list",
    {
      title: "List settings in a group",
      description:
        "Lists all setting options within a settings group (e.g. general, products). Use this to inspect current store configuration values such as currency, country, or tax display.",
      inputSchema: {
        group: z
          .string()
          .min(1)
          .describe("Settings group ID. Example: general, products, tax"),
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 100;
        const res = await client.get<unknown[]>(`settings/${args.group}`, {
          page,
          per_page,
        });
        const meta = client.pagination(res, page, per_page);
        const items = Array.isArray(res.data) ? res.data : [];
        return textContent(
          parseListOutput(
            items,
            meta.currentPage,
            meta.perPage,
            meta.total || items.length,
            meta.totalPages,
            WcEntitySchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_settings_get",
    {
      title: "Get setting option",
      description:
        "Retrieves a single setting option by group and option ID. Use this when you need the current value and metadata (type, default, options) for one configuration key.",
      inputSchema: {
        group: z.string().min(1).describe("Settings group ID. Example: general"),
        id: z
          .string()
          .min(1)
          .describe("Setting option ID. Example: woocommerce_currency"),
      },
    },
    async (args) => {
      try {
        const res = await client.get(`settings/${args.group}/${args.id}`);
        return textContent(parseSingleOutput(res.data, WcEntitySchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_settings_update",
    {
      title: "Update setting option",
      description:
        "Updates a single setting option value. Use this carefully for configuration changes such as currency, store address, or tax display — always confirm intent with the user for production stores.",
      inputSchema: {
        group: z.string().min(1).describe("Settings group ID"),
        id: z.string().min(1).describe("Setting option ID"),
        value: z
          .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
          .describe("New value for the setting"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(`settings/${args.group}/${args.id}`, {
          value: args.value,
        });
        return textContent(parseSingleOutput(res.data, WcEntitySchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );
}
