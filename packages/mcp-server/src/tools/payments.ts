/**
 * Payment gateway tools — list, get, update settings.
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

export function registerPaymentTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_payments_list",
    {
      title: "List payment gateways",
      description:
        "Lists all payment gateways registered in the store (enabled and disabled). Use this to audit checkout payment options or find gateway IDs before updating settings.",
      inputSchema: {
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("payment_gateways", {
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
    "woo_payments_get",
    {
      title: "Get payment gateway",
      description:
        "Retrieves a single payment gateway by its ID string (e.g. bacs, cod, stripe). Use this to inspect title, enabled flag, and settings fields for a specific method.",
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe("Gateway ID. Example: \"bacs\" or \"cod\""),
      },
    },
    async (args) => {
      try {
        const res = await client.get(`payment_gateways/${args.id}`);
        return textContent(parseSingleOutput(res.data, WcEntitySchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_payments_update",
    {
      title: "Update payment gateway",
      description:
        "Updates payment gateway settings such as enabled state, title, or method-specific options. Use this carefully when enabling/disabling checkout methods or fixing gateway configuration from an agent workflow.",
      inputSchema: {
        id: z.string().min(1).describe("Gateway ID to update"),
        data: z
          .object({
            enabled: z.boolean().optional().describe("Whether gateway is enabled"),
            title: z.string().optional().describe("Checkout title"),
            description: z.string().optional().describe("Checkout description"),
            order: z.number().optional().describe("Display order"),
            settings: z.record(z.unknown()).optional().describe("Gateway-specific settings map"),
          })
          .passthrough()
          .describe("Fields to update on the gateway"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(
          `payment_gateways/${args.id}`,
          args.data as Record<string, unknown>,
        );
        return textContent(parseSingleOutput(res.data, WcEntitySchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );
}
