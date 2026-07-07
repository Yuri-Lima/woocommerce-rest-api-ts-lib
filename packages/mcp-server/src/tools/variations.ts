/**
 * Product variation tools — list, get, create, update, delete.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import {
  DeleteResponseSchema,
  PaginationInputSchema,
  VariationSchema,
  parseListOutput,
  parseSingleOutput,
  textContent,
} from "../types.js";

const VariationCreateSchema = z
  .object({
    regular_price: z.string().optional().describe("Regular price. Example: \"19.99\""),
    sale_price: z.string().optional().describe("Sale price"),
    sku: z.string().optional().describe("Variation SKU"),
    manage_stock: z.boolean().optional(),
    stock_quantity: z.number().optional(),
    stock_status: z.enum(["instock", "outofstock", "onbackorder"]).optional(),
    attributes: z
      .array(
        z.object({
          id: z.number().optional(),
          name: z.string(),
          option: z.string(),
        }),
      )
      .optional()
      .describe("Attribute options that define this variation"),
    image: z.object({ src: z.string().url() }).optional(),
    status: z.enum(["publish", "private", "draft"]).optional(),
  })
  .passthrough();

export function registerVariationTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_variations_list",
    {
      title: "List product variations",
      description:
        "Lists variations for a parent variable product with pagination. Use this when managing size/color SKUs, checking per-variant stock, or syncing variant pricing.",
      inputSchema: {
        product_id: z
          .number()
          .int()
          .positive()
          .describe("Parent variable product ID"),
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>(
          `products/${args.product_id}/variations`,
          { page, per_page },
        );
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total,
            meta.totalPages,
            VariationSchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_variations_get",
    {
      title: "Get product variation",
      description:
        "Retrieves a single product variation by parent product ID and variation ID. Use this for detailed variant pricing, stock, or attribute inspection.",
      inputSchema: {
        product_id: z.number().int().positive().describe("Parent product ID"),
        id: z.number().int().positive().describe("Variation ID"),
      },
    },
    async (args) => {
      try {
        // Library uses id query param; nested path also works via endpoint string
        const res = await client.get(
          `products/${args.product_id}/variations/${args.id}`,
        );
        return textContent(parseSingleOutput(res.data, VariationSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_variations_create",
    {
      title: "Create product variation",
      description:
        "Creates a new variation under a variable product. Use this when adding a new size/color combination with its own price and stock.",
      inputSchema: {
        product_id: z.number().int().positive().describe("Parent product ID"),
        data: VariationCreateSchema.describe("Variation fields"),
      },
    },
    async (args) => {
      try {
        const res = await client.post(
          `products/${args.product_id}/variations`,
          args.data as Record<string, unknown>,
        );
        return textContent(parseSingleOutput(res.data, VariationSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_variations_update",
    {
      title: "Update product variation",
      description:
        "Updates an existing product variation. Use this for variant price changes, stock adjustments, or attribute corrections.",
      inputSchema: {
        product_id: z.number().int().positive().describe("Parent product ID"),
        id: z.number().int().positive().describe("Variation ID"),
        data: VariationCreateSchema.partial()
          .passthrough()
          .describe("Fields to update"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(
          `products/${args.product_id}/variations/${args.id}`,
          args.data as Record<string, unknown>,
        );
        return textContent(parseSingleOutput(res.data, VariationSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_variations_delete",
    {
      title: "Delete product variation",
      description:
        "Deletes a product variation by ID. Use this to remove obsolete size/color SKUs from a variable product. force=true permanently deletes.",
      inputSchema: {
        product_id: z.number().int().positive().describe("Parent product ID"),
        id: z.number().int().positive().describe("Variation ID"),
        force: z.boolean().default(true).optional(),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          `products/${args.product_id}/variations/${args.id}`,
          { force: args.force ?? true },
        );
        return textContent(
          DeleteResponseSchema.parse({
            deleted: true,
            previous: res.data,
            id: args.id,
          }),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );
}
