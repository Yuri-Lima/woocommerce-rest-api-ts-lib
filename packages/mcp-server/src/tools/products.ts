/**
 * Product tools — list, get, create, update, delete, search, batch.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import {
  BatchOperationSchema,
  BatchResponseSchema,
  DeleteResponseSchema,
  ListDetailSchema,
  ListFieldsSchema,
  PaginationInputSchema,
  PRODUCT_SUMMARY_FIELDS,
  ProductSchema,
  parseListOutput,
  parseSingleOutput,
  resolveListFields,
  textContent,
} from "../types.js";

const ProductCreateSchema = z
  .object({
    name: z.string().describe("Product name. Example: \"Blue T-Shirt\""),
    type: z
      .enum(["simple", "grouped", "external", "variable"])
      .optional()
      .describe("Product type. Default simple."),
    regular_price: z
      .string()
      .optional()
      .describe("Regular price as string. Example: \"29.99\""),
    description: z.string().optional().describe("Full HTML description"),
    short_description: z.string().optional().describe("Short description / excerpt"),
    sku: z.string().optional().describe("Stock keeping unit"),
    manage_stock: z.boolean().optional().describe("Whether to manage stock"),
    stock_quantity: z.number().optional().describe("Stock quantity when manage_stock is true"),
    categories: z
      .array(z.object({ id: z.number() }))
      .optional()
      .describe("Category IDs to assign"),
    images: z
      .array(z.object({ src: z.string().url() }))
      .optional()
      .describe("Product images by source URL"),
    status: z
      .enum(["draft", "pending", "private", "publish"])
      .optional()
      .describe("Publish status"),
  })
  .passthrough();

export function registerProductTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_products_list",
    {
      title: "List products",
      description:
        "Lists products from the WooCommerce catalog with pagination. Default detail=summary uses a slim `_fields` projection (no HTML descriptions/images) to cut tokens and memory — use detail=full or woo_products_get when you need the complete product. Returns product objects plus pagination metadata.",
      inputSchema: {
        ...PaginationInputSchema.shape,
        status: z
          .enum(["any", "draft", "pending", "private", "publish"])
          .optional()
          .describe("Filter by publish status. Example: publish"),
        category: z
          .string()
          .optional()
          .describe("Filter by category ID. Example: \"15\""),
        tag: z.string().optional().describe("Filter by tag ID"),
        stock_status: z
          .enum(["instock", "outofstock", "onbackorder"])
          .optional()
          .describe("Filter by stock status"),
        orderby: z
          .enum(["date", "id", "title", "slug", "price", "popularity", "rating"])
          .optional()
          .describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
        detail: ListDetailSchema,
        fields: ListFieldsSchema,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const _fields = resolveListFields(
          args.detail,
          args.fields,
          PRODUCT_SUMMARY_FIELDS,
        );
        const res = await client.get<unknown[]>("products", {
          page,
          per_page,
          status: args.status,
          category: args.category,
          tag: args.tag,
          stock_status: args.stock_status,
          orderby: args.orderby,
          order: args.order,
          ...(_fields ? { _fields } : {}),
        });
        const meta = client.pagination(res, page, per_page);
        const out = parseListOutput(
          res.data,
          meta.currentPage,
          meta.perPage,
          meta.total,
          meta.totalPages,
          ProductSchema,
        );
        return textContent(out);
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_products_get",
    {
      title: "Get product",
      description:
        "Retrieves a single product by its numeric ID, including prices, stock, images, categories, and attributes. Use this when you already know the product ID and need full details for editing, display, or diagnostics.",
      inputSchema: {
        id: z.number().int().positive().describe("Product ID. Example: 42"),
      },
    },
    async (args) => {
      try {
        const res = await client.get("products", { id: args.id });
        return textContent(parseSingleOutput(res.data, ProductSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_products_create",
    {
      title: "Create product",
      description:
        "Creates a new product in the WooCommerce catalog. Use this to add simple or variable products with pricing, descriptions, categories, and images. Returns the created product object including the new ID.",
      inputSchema: ProductCreateSchema.shape,
    },
    async (args) => {
      try {
        const res = await client.post("products", args as Record<string, unknown>);
        return textContent(parseSingleOutput(res.data, ProductSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_products_update",
    {
      title: "Update product",
      description:
        "Updates an existing product by ID. Only fields you provide are changed (partial update). Use this for price changes, stock adjustments, description edits, or status transitions without re-sending the full product.",
      inputSchema: {
        id: z.number().int().positive().describe("Product ID to update"),
        data: ProductCreateSchema.partial()
          .passthrough()
          .describe("Fields to update on the product"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(
          "products",
          args.data as Record<string, unknown>,
          { id: args.id },
        );
        return textContent(parseSingleOutput(res.data, ProductSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_products_delete",
    {
      title: "Delete product",
      description:
        "Deletes a product by ID. By default force=true permanently deletes; set force=false to move to trash when supported. Use this for catalog cleanup or removing test products.",
      inputSchema: {
        id: z.number().int().positive().describe("Product ID to delete"),
        force: z
          .boolean()
          .default(true)
          .optional()
          .describe("Permanently delete when true (default true)"),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          "products",
          { force: args.force ?? true },
          { id: args.id },
        );
        const out = DeleteResponseSchema.parse({
          deleted: true,
          previous: res.data,
          id: args.id,
        });
        return textContent(out);
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_products_search",
    {
      title: "Search products",
      description:
        "Searches products by a free-text query matching name, SKU, and description fields. Default detail=summary uses a slim `_fields` projection. Returns paginated matching products.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Search query string. Example: \"blue shirt\""),
        ...PaginationInputSchema.shape,
        detail: ListDetailSchema,
        fields: ListFieldsSchema,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const _fields = resolveListFields(
          args.detail,
          args.fields,
          PRODUCT_SUMMARY_FIELDS,
        );
        const res = await client.get<unknown[]>("products", {
          search: args.query,
          page,
          per_page,
          ...(_fields ? { _fields } : {}),
        });
        const meta = client.pagination(res, page, per_page);
        const out = parseListOutput(
          res.data,
          meta.currentPage,
          meta.perPage,
          meta.total,
          meta.totalPages,
          ProductSchema,
        );
        return textContent(out);
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_products_batch",
    {
      title: "Batch products",
      description:
        "Performs multiple product create, update, and/or delete operations in a single API call. Use this for bulk catalog imports, mass price updates, or multi-item cleanup to reduce round-trips and respect rate limits.",
      inputSchema: BatchOperationSchema.shape,
    },
    async (args) => {
      try {
        const res = await client.post("products/batch", args as Record<string, unknown>);
        const out = BatchResponseSchema.parse(res.data ?? {});
        return textContent(out);
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );
}
