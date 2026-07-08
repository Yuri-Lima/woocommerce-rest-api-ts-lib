/**
 * Shared Zod schemas for MCP tool inputs and outputs.
 * Every tool validates both directions: input from the model, output from WC API.
 */

import { z } from "zod";
import {
  buildToolPayloadUsage,
  estimateTokensFromText,
  recordToolUsage,
  usageMetaForText,
  type ToolPayloadUsage,
} from "./usage.js";

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PaginationInputSchema = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("Page number to retrieve (1-based). Example: 1")
    .optional(),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe("Number of items per page (1–100). Example: 20")
    .optional(),
});

export const PaginationMetaSchema = z.object({
  total: z.number().describe("Total number of matching items across all pages"),
  totalPages: z.number().describe("Total number of pages available"),
  currentPage: z.number().describe("The page that was returned"),
  perPage: z.number().describe("Items requested per page"),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// ─── Common entity fragments ──────────────────────────────────────────────────

/** Loose object for WC entities — validates shape without rejecting extra fields.
 *  `id` may be number (products/orders) or string (payment gateways, shipping methods).
 */
export const WcEntitySchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

export const ProductSchema = z
  .object({
    id: z.number().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    permalink: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    short_description: z.string().optional(),
    sku: z.string().optional(),
    price: z.union([z.string(), z.number()]).optional(),
    regular_price: z.union([z.string(), z.number()]).optional(),
    sale_price: z.union([z.string(), z.number()]).optional(),
    stock_quantity: z.number().nullable().optional(),
    stock_status: z.string().optional(),
    manage_stock: z.boolean().optional(),
    categories: z.array(z.unknown()).optional(),
    tags: z.array(z.unknown()).optional(),
    images: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const OrderSchema = z
  .object({
    id: z.number().optional(),
    status: z.string().optional(),
    currency: z.string().optional(),
    total: z.union([z.string(), z.number()]).optional(),
    customer_id: z.number().optional(),
    billing: z.record(z.unknown()).optional(),
    shipping: z.record(z.unknown()).optional(),
    line_items: z.array(z.unknown()).optional(),
    date_created: z.string().optional(),
  })
  .passthrough();

export const CustomerSchema = z
  .object({
    id: z.number().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    role: z.string().optional(),
    billing: z.record(z.unknown()).optional(),
    shipping: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const CouponSchema = z
  .object({
    id: z.number().optional(),
    code: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    discount_type: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();

export const CategorySchema = z
  .object({
    id: z.number().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    parent: z.number().optional(),
    description: z.string().optional(),
    count: z.number().optional(),
  })
  .passthrough();

export const TagSchema = z
  .object({
    id: z.number().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    count: z.number().optional(),
  })
  .passthrough();

export const VariationSchema = z
  .object({
    id: z.number().optional(),
    sku: z.string().optional(),
    price: z.union([z.string(), z.number()]).optional(),
    regular_price: z.union([z.string(), z.number()]).optional(),
    stock_quantity: z.number().nullable().optional(),
    stock_status: z.string().optional(),
    attributes: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const WebhookSchema = z
  .object({
    id: z.number().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    topic: z.string().optional(),
    delivery_url: z.string().optional(),
  })
  .passthrough();

export const TaxRateSchema = z
  .object({
    id: z.number().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    rate: z.string().optional(),
    name: z.string().optional(),
    class: z.string().optional(),
  })
  .passthrough();

export const OrderNoteSchema = z
  .object({
    id: z.number().optional(),
    author: z.string().optional(),
    date_created: z.string().optional(),
    note: z.string().optional(),
    customer_note: z.boolean().optional(),
  })
  .passthrough();

export const OrderRefundSchema = z
  .object({
    id: z.number().optional(),
    date_created: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    reason: z.string().optional(),
    refunded_by: z.number().optional(),
    refunded_payment: z.boolean().optional(),
    line_items: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const ProductReviewSchema = z
  .object({
    id: z.number().optional(),
    product_id: z.number().optional(),
    status: z.string().optional(),
    reviewer: z.string().optional(),
    reviewer_email: z.string().optional(),
    review: z.string().optional(),
    rating: z.number().optional(),
    verified: z.boolean().optional(),
    date_created: z.string().optional(),
  })
  .passthrough();

// ─── List response wrapper ────────────────────────────────────────────────────

export function listResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });
}

export function singleResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    item: itemSchema,
  });
}

export const DeleteResponseSchema = z.object({
  deleted: z.boolean(),
  previous: z.unknown().optional(),
  id: z.number().optional(),
});

export const BatchResponseSchema = z.object({
  create: z.array(z.unknown()).optional(),
  update: z.array(z.unknown()).optional(),
  delete: z.array(z.unknown()).optional(),
});

// ─── Batch operation input ────────────────────────────────────────────────────

export const BatchOperationSchema = z.object({
  create: z
    .array(z.record(z.unknown()))
    .optional()
    .describe("Array of objects to create"),
  update: z
    .array(
      z
        .object({ id: z.number().describe("ID of the resource to update") })
        .passthrough(),
    )
    .optional()
    .describe("Array of objects to update (each must include id)"),
  delete: z
    .array(z.number())
    .optional()
    .describe("Array of resource IDs to delete"),
});

// ─── List field projection (memory + token savings) ───────────────────────────

/**
 * WooCommerce `_fields` projections for list endpoints.
 * Summary omits HTML descriptions, images, meta, and address blobs that dominate
 * MCP tool payloads when agents only need inventory/order overviews.
 */
export const PRODUCT_SUMMARY_FIELDS =
  "id,name,slug,type,status,sku,price,regular_price,sale_price,stock_quantity,stock_status,manage_stock,categories,permalink";

export const ORDER_SUMMARY_FIELDS =
  "id,status,currency,total,customer_id,date_created,billing,shipping,line_items,number,payment_method";

export const CUSTOMER_SUMMARY_FIELDS =
  "id,email,first_name,last_name,username,role,date_created,orders_count,total_spent";

/** Shared detail mode for high-volume list tools. Default is summary. */
export const ListDetailSchema = z
  .enum(["summary", "full"])
  .default("summary")
  .describe(
    'Payload detail. "summary" (default) requests a slim `_fields` projection from WooCommerce to cut tokens/memory; "full" returns the complete entity. Override with `fields` for a custom comma-separated `_fields` list.',
  );

export const ListFieldsSchema = z
  .string()
  .optional()
  .describe(
    "Optional comma-separated WooCommerce `_fields` projection. When set, overrides the default summary field set. Example: id,name,price,stock_status",
  );

/**
 * Resolve `_fields` for a list call.
 * - detail=summary (default) → defaultFields unless `fields` overrides
 * - detail=full → no projection unless `fields` is set
 */
export function resolveListFields(
  detail: "summary" | "full" | undefined,
  fields: string | undefined,
  defaultFields: string,
): string | undefined {
  if (fields && fields.trim()) return fields.trim();
  if (detail === "full") return undefined;
  return defaultFields;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseListOutput<T>(
  items: unknown,
  page: number,
  perPage: number,
  total: number,
  totalPages: number,
  itemSchema: z.ZodType<T>,
) {
  const schema = listResponseSchema(itemSchema);
  return schema.parse({
    items: Array.isArray(items) ? items : [],
    pagination: {
      total,
      totalPages,
      currentPage: page,
      perPage,
    },
  });
}

export function parseSingleOutput<T>(item: unknown, itemSchema: z.ZodType<T>) {
  return singleResponseSchema(itemSchema).parse({ item });
}

export interface TextContentOptions {
  /** Tool name for session usage rollups */
  tool?: string;
  /**
   * When true (default), attach `usage` on object payloads and MCP `_meta`.
   * Set false only for internal/test payloads that must stay byte-identical.
   */
  includeUsage?: boolean;
}

export interface McpTextContentResult {
  content: Array<{ type: "text"; text: string }>;
  _meta?: {
    "woo.usage": ToolPayloadUsage & { tool?: string };
  };
  /** Index signature so results assign to MCP SDK CallToolResult. */
  [key: string]: unknown;
}

/**
 * Compact JSON serialize — single-pass, no pretty-print whitespace.
 * Pretty JSON (indent 2) inflates MCP tool payloads ~25–40% for nested WC objects,
 * which multiplies into model input tokens on every tool result.
 */
export function compactJson(data: unknown): string {
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

/**
 * Serialize tool data as MCP text content (compact JSON).
 * Always attaches token-usage estimates (payload size) unless includeUsage=false.
 *
 * Single-pass path: when attaching usage we stringify once for the estimate,
 * then build the final body and stringify once more (unavoidable if usage is
 * embedded). No pretty-print intermediate strings are retained.
 */
export function textContent(
  data: unknown,
  options: TextContentOptions = {},
): McpTextContentResult {
  const includeUsage = options.includeUsage !== false;
  let usage: ToolPayloadUsage | undefined;
  let text: string;

  if (
    includeUsage &&
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    // Estimate from business payload only (before attaching usage) so the
    // usage object does not inflate its own estimate.
    const baseText = compactJson(data);
    usage = recordToolUsage(baseText, { tool: options.tool });
    text = compactJson({
      ...(data as Record<string, unknown>),
      usage,
    });
  } else {
    text = compactJson(data);
  }

  if (!includeUsage) {
    return { content: [{ type: "text", text }] };
  }

  // Non-object payloads still get _meta usage (and session tracking).
  if (!usage) {
    usage = recordToolUsage(text, { tool: options.tool });
  }

  return {
    content: [{ type: "text", text }],
    _meta: {
      "woo.usage": {
        ...usage,
        ...(options.tool ? { tool: options.tool } : {}),
      },
    },
  };
}

export { buildToolPayloadUsage, estimateTokensFromText, usageMetaForText };