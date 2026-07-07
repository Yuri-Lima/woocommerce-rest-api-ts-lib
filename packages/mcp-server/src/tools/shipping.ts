/**
 * Shipping tools — zones, methods, classes.
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

export function registerShippingTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_shipping_zones_list",
    {
      title: "List shipping zones",
      description:
        "Lists all shipping zones configured in the store. Use this to understand regional shipping setup before inspecting methods or diagnosing delivery options.",
      inputSchema: {
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("shipping/zones", { page, per_page });
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total || (Array.isArray(res.data) ? res.data.length : 0),
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
    "woo_shipping_zones_get",
    {
      title: "Get shipping zone",
      description:
        "Retrieves a single shipping zone by ID including name and order. Use this when drilling into a specific zone from the list.",
      inputSchema: {
        id: z.number().int().nonnegative().describe("Shipping zone ID (0 = Locations not covered)"),
      },
    },
    async (args) => {
      try {
        const res = await client.get(`shipping/zones/${args.id}`);
        return textContent(parseSingleOutput(res.data, WcEntitySchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_shipping_zone_methods_list",
    {
      title: "List shipping zone methods",
      description:
        "Lists shipping methods enabled for a given zone (flat rate, free shipping, local pickup, etc.). Use this to audit delivery options available to customers in that region.",
      inputSchema: {
        zone_id: z.number().int().nonnegative().describe("Shipping zone ID"),
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>(
          `shipping/zones/${args.zone_id}/methods`,
          { page, per_page },
        );
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total || (Array.isArray(res.data) ? res.data.length : 0),
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
    "woo_shipping_methods_list",
    {
      title: "List shipping methods",
      description:
        "Lists all registered shipping method types available in WooCommerce (not zone assignments). Use this to see which method plugins/classes the store supports.",
      inputSchema: {
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("shipping_methods", { page, per_page });
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total || (Array.isArray(res.data) ? res.data.length : 0),
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
    "woo_shipping_classes_list",
    {
      title: "List shipping classes",
      description:
        "Lists product shipping classes used to group products for rate calculation. Use this when assigning classes to products or configuring class-based flat rates.",
      inputSchema: {
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("products/shipping_classes", {
          page,
          per_page,
        });
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total,
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
    "woo_shipping_classes_get",
    {
      title: "Get shipping class",
      description:
        "Retrieves a single product shipping class by ID. Use this to inspect slug, description, and count for a specific class.",
      inputSchema: {
        id: z.number().int().positive().describe("Shipping class ID"),
      },
    },
    async (args) => {
      try {
        const res = await client.get("products/shipping_classes", { id: args.id });
        return textContent(parseSingleOutput(res.data, WcEntitySchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );
}
