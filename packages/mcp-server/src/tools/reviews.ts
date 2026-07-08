/**
 * Product review tools — list, get, create, update, delete.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import {
  DeleteResponseSchema,
  PaginationInputSchema,
  ProductReviewSchema,
  parseListOutput,
  parseSingleOutput,
  textContent,
} from "../types.js";

export function registerReviewTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_reviews_list",
    {
      title: "List product reviews",
      description:
        "Lists product reviews with optional filters for product, status, and reviewer. Use this for moderation queues, reputation checks, or finding unapproved reviews before publish.",
      inputSchema: {
        ...PaginationInputSchema.shape,
        product: z
          .array(z.number())
          .optional()
          .describe("Limit to these product IDs. Example: [12, 34]"),
        status: z
          .enum(["all", "hold", "approved", "spam", "trash"])
          .optional()
          .describe("Review status filter. Default approved on WC side when omitted."),
        reviewer: z
          .array(z.number())
          .optional()
          .describe("Limit to reviewer user IDs"),
        orderby: z
          .enum(["date", "date_gmt", "id", "slug", "include", "product"])
          .optional()
          .describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("products/reviews", {
          page,
          per_page,
          product: args.product,
          status: args.status,
          reviewer: args.reviewer,
          orderby: args.orderby,
          order: args.order,
        });
        const meta = client.pagination(res, page, per_page);
        const out = parseListOutput(
          res.data,
          meta.currentPage,
          meta.perPage,
          meta.total,
          meta.totalPages,
          ProductReviewSchema,
        );
        return textContent(out);
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_reviews_get",
    {
      title: "Get product review",
      description:
        "Retrieves a single product review by ID including rating, content, and approval status. Use when moderating a specific review from a list or notification.",
      inputSchema: {
        id: z.number().int().positive().describe("Review ID"),
      },
    },
    async (args) => {
      try {
        const res = await client.get(`products/reviews/${args.id}`);
        return textContent(parseSingleOutput(res.data, ProductReviewSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_reviews_create",
    {
      title: "Create product review",
      description:
        "Creates a product review (rating 1–5). Useful for seeding demo data or importing historical reviews. Prefer status=hold for moderation workflows.",
      inputSchema: {
        product_id: z.number().int().positive().describe("Product ID being reviewed"),
        review: z.string().min(1).describe("Review body text"),
        reviewer: z.string().min(1).describe("Reviewer display name"),
        reviewer_email: z.string().email().describe("Reviewer email address"),
        rating: z
          .number()
          .int()
          .min(0)
          .max(5)
          .optional()
          .describe("Star rating 0–5. Example: 5"),
        status: z
          .enum(["approved", "hold", "spam", "trash"])
          .optional()
          .describe("Approval status. Default often hold depending on store settings."),
      },
    },
    async (args) => {
      try {
        const res = await client.post("products/reviews", {
          product_id: args.product_id,
          review: args.review,
          reviewer: args.reviewer,
          reviewer_email: args.reviewer_email,
          rating: args.rating,
          status: args.status,
        });
        return textContent(parseSingleOutput(res.data, ProductReviewSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_reviews_update",
    {
      title: "Update product review",
      description:
        "Updates a product review (status, rating, text). Use this to approve/spam reviews or correct imported content.",
      inputSchema: {
        id: z.number().int().positive().describe("Review ID to update"),
        data: z
          .object({
            review: z.string().optional(),
            reviewer: z.string().optional(),
            reviewer_email: z.string().email().optional(),
            rating: z.number().int().min(0).max(5).optional(),
            status: z.enum(["approved", "hold", "spam", "trash"]).optional(),
          })
          .passthrough()
          .describe("Fields to update"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(`products/reviews/${args.id}`, args.data);
        return textContent(parseSingleOutput(res.data, ProductReviewSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_reviews_delete",
    {
      title: "Delete product review",
      description:
        "Deletes a product review by ID. force=true permanently deletes; otherwise moves to trash when supported.",
      inputSchema: {
        id: z.number().int().positive().describe("Review ID to delete"),
        force: z.boolean().default(true).optional().describe("Permanent delete (default true)"),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          `products/reviews/${args.id}`,
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
