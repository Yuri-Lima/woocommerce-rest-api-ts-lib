/**
 * Shared Zod schemas for MCP tool inputs and outputs.
 * Every tool validates both directions: input from the model, output from WC API.
 */

import { z } from "zod";

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

export function textContent(data: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}
