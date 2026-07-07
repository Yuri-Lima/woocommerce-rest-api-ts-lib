/**
 * Product category tools — list, get, create, update, delete.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import {
  CategorySchema,
  DeleteResponseSchema,
  PaginationInputSchema,
  parseListOutput,
  parseSingleOutput,
  textContent,
} from "../types.js";

const CategoryCreateSchema = z
  .object({
    name: z.string().describe("Category name. Example: Apparel"),
    slug: z.string().optional().describe("URL slug"),
    parent: z.number().optional().describe("Parent category ID for hierarchy"),
    description: z.string().optional().describe("Category description HTML"),
    display: z
      .enum(["default", "products", "subcategories", "both"])
      .optional()
      .describe("Catalog display type"),
    image: z.object({ src: z.string().url() }).optional().describe("Category image"),
    menu_order: z.number().optional(),
  })
  .passthrough();

export function registerCategoryTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_categories_list",
    {
      title: "List product categories",
      description:
        "Lists product categories with pagination and optional parent filter. Use this to understand catalog taxonomy, build navigation, or assign products to the correct category IDs.",
      inputSchema: {
        ...PaginationInputSchema.shape,
        parent: z.number().optional().describe("Only children of this category ID"),
        hide_empty: z.boolean().optional().describe("Hide categories with no products"),
        search: z.string().optional().describe("Search category names"),
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("products/categories", {
          page,
          per_page,
          parent: args.parent,
          hide_empty: args.hide_empty,
          search: args.search,
        });
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total,
            meta.totalPages,
            CategorySchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_categories_get",
    {
      title: "Get product category",
      description:
        "Retrieves a single product category by ID. Use this when you need the full category record including description, image, and product count.",
      inputSchema: {
        id: z.number().int().positive().describe("Category ID"),
      },
    },
    async (args) => {
      try {
        const res = await client.get("products/categories", { id: args.id });
        return textContent(parseSingleOutput(res.data, CategorySchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_categories_create",
    {
      title: "Create product category",
      description:
        "Creates a new product category, optionally nested under a parent. Use this when structuring or expanding the store catalog taxonomy.",
      inputSchema: CategoryCreateSchema.shape,
    },
    async (args) => {
      try {
        const res = await client.post(
          "products/categories",
          args as Record<string, unknown>,
        );
        return textContent(parseSingleOutput(res.data, CategorySchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_categories_update",
    {
      title: "Update product category",
      description:
        "Updates an existing product category by ID. Use this to rename categories, fix slugs, re-parent nodes, or update descriptions for SEO.",
      inputSchema: {
        id: z.number().int().positive().describe("Category ID"),
        data: CategoryCreateSchema.partial().passthrough().describe("Fields to update"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(
          "products/categories",
          args.data as Record<string, unknown>,
          { id: args.id },
        );
        return textContent(parseSingleOutput(res.data, CategorySchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_categories_delete",
    {
      title: "Delete product category",
      description:
        "Deletes a product category by ID. Products are not deleted; they simply lose this category assignment. force=true permanently deletes.",
      inputSchema: {
        id: z.number().int().positive().describe("Category ID"),
        force: z.boolean().default(true).optional(),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          "products/categories",
          { force: args.force ?? true },
          { id: args.id },
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
