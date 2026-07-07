/**
 * Coupon tools — list, get, create, update, delete.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import {
  CouponSchema,
  DeleteResponseSchema,
  PaginationInputSchema,
  parseListOutput,
  parseSingleOutput,
  textContent,
} from "../types.js";

const CouponCreateSchema = z
  .object({
    code: z.string().describe("Coupon code. Example: SUMMER20"),
    discount_type: z
      .enum(["percent", "fixed_cart", "fixed_product"])
      .optional()
      .describe("How the discount is calculated"),
    amount: z.string().optional().describe("Discount amount as string. Example: \"20\""),
    description: z.string().optional().describe("Internal description"),
    individual_use: z.boolean().optional(),
    exclude_sale_items: z.boolean().optional(),
    minimum_amount: z.string().optional(),
    maximum_amount: z.string().optional(),
    usage_limit: z.number().optional(),
    usage_limit_per_user: z.number().optional(),
    free_shipping: z.boolean().optional(),
    date_expires: z.string().nullable().optional().describe("ISO date when coupon expires"),
  })
  .passthrough();

export function registerCouponTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_coupons_list",
    {
      title: "List coupons",
      description:
        "Lists discount coupons with pagination. Use this to audit active promotions, find a code by browsing, or report on campaign inventory.",
      inputSchema: {
        ...PaginationInputSchema.shape,
        code: z.string().optional().describe("Filter by exact coupon code"),
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("coupons", {
          page,
          per_page,
          code: args.code,
        });
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total,
            meta.totalPages,
            CouponSchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_coupons_get",
    {
      title: "Get coupon",
      description:
        "Retrieves a single coupon by ID including amount, limits, and expiry. Use this when you already have the coupon ID from a list or order coupon_lines.",
      inputSchema: {
        id: z.number().int().positive().describe("Coupon ID"),
      },
    },
    async (args) => {
      try {
        const res = await client.get("coupons", { id: args.id });
        return textContent(parseSingleOutput(res.data, CouponSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_coupons_create",
    {
      title: "Create coupon",
      description:
        "Creates a new coupon code with discount type, amount, and optional limits. Use this to launch promotions or generate one-off support discounts.",
      inputSchema: CouponCreateSchema.shape,
    },
    async (args) => {
      try {
        const res = await client.post("coupons", args as Record<string, unknown>);
        return textContent(parseSingleOutput(res.data, CouponSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_coupons_update",
    {
      title: "Update coupon",
      description:
        "Updates an existing coupon by ID (amount, expiry, usage limits, etc.). Use this to extend campaigns or disable a code without deleting history.",
      inputSchema: {
        id: z.number().int().positive().describe("Coupon ID"),
        data: CouponCreateSchema.partial().passthrough().describe("Fields to update"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(
          "coupons",
          args.data as Record<string, unknown>,
          { id: args.id },
        );
        return textContent(parseSingleOutput(res.data, CouponSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_coupons_delete",
    {
      title: "Delete coupon",
      description:
        "Deletes a coupon by ID. Use this to retire obsolete or leaked promo codes. force=true permanently removes the coupon.",
      inputSchema: {
        id: z.number().int().positive().describe("Coupon ID"),
        force: z.boolean().default(true).optional(),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          "coupons",
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
