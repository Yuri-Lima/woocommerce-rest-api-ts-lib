/**
 * Product tag tools — list, get, create, update, delete.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import {
  DeleteResponseSchema,
  PaginationInputSchema,
  TagSchema,
  parseListOutput,
  parseSingleOutput,
  textContent,
} from "../types.js";

const TagCreateSchema = z
  .object({
    name: z.string().describe("Tag name. Example: organic"),
    slug: z.string().optional().describe("URL slug"),
    description: z.string().optional().describe("Tag description"),
  })
  .passthrough();

export function registerTagTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_tags_list",
    {
      title: "List product tags",
      description:
        "Lists product tags with pagination. Use this to discover available tags for filtering, merchandising, or assigning to products during catalog work.",
      inputSchema: {
        ...PaginationInputSchema.shape,
        search: z.string().optional().describe("Search tag names"),
        hide_empty: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("products/tags", {
          page,
          per_page,
          search: args.search,
          hide_empty: args.hide_empty,
        });
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total,
            meta.totalPages,
            TagSchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_tags_get",
    {
      title: "Get product tag",
      description:
        "Retrieves a single product tag by ID. Use this when you need the full tag record including slug and product count.",
      inputSchema: {
        id: z.number().int().positive().describe("Tag ID"),
      },
    },
    async (args) => {
      try {
        const res = await client.get("products/tags", { id: args.id });
        return textContent(parseSingleOutput(res.data, TagSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_tags_create",
    {
      title: "Create product tag",
      description:
        "Creates a new product tag. Use this when introducing a new merchandising or SEO label that products can share.",
      inputSchema: TagCreateSchema.shape,
    },
    async (args) => {
      try {
        const res = await client.post("products/tags", args as Record<string, unknown>);
        return textContent(parseSingleOutput(res.data, TagSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_tags_update",
    {
      title: "Update product tag",
      description:
        "Updates an existing product tag by ID. Use this to rename tags or improve descriptions for storefront filters and SEO.",
      inputSchema: {
        id: z.number().int().positive().describe("Tag ID"),
        data: TagCreateSchema.partial().passthrough().describe("Fields to update"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(
          "products/tags",
          args.data as Record<string, unknown>,
          { id: args.id },
        );
        return textContent(parseSingleOutput(res.data, TagSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_tags_delete",
    {
      title: "Delete product tag",
      description:
        "Deletes a product tag by ID. Products keep their other tags; only this association is removed. force=true permanently deletes.",
      inputSchema: {
        id: z.number().int().positive().describe("Tag ID"),
        force: z.boolean().default(true).optional(),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          "products/tags",
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
