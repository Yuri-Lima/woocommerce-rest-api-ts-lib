/**
 * Order tools — list, get, create, update, delete, notes, refunds, batch.
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
  ORDER_SUMMARY_FIELDS,
  OrderNoteSchema,
  OrderRefundSchema,
  OrderSchema,
  PaginationInputSchema,
  parseListOutput,
  parseSingleOutput,
  resolveListFields,
  textContent,
} from "../types.js";

const LineItemInput = z.object({
  product_id: z.number().describe("Product ID to order"),
  quantity: z.number().int().positive().describe("Quantity. Example: 2"),
  variation_id: z.number().optional().describe("Variation ID for variable products"),
});

const OrderCreateSchema = z
  .object({
    status: z
      .enum([
        "pending",
        "processing",
        "on-hold",
        "completed",
        "cancelled",
        "refunded",
        "failed",
      ])
      .optional()
      .describe("Order status"),
    customer_id: z.number().optional().describe("Existing customer ID (0 for guest)"),
    payment_method: z.string().optional().describe("Payment method ID, e.g. bacs"),
    payment_method_title: z.string().optional().describe("Payment method title"),
    set_paid: z.boolean().optional().describe("Mark order as paid on create"),
    billing: z.record(z.unknown()).optional().describe("Billing address object"),
    shipping: z.record(z.unknown()).optional().describe("Shipping address object"),
    line_items: z.array(LineItemInput).optional().describe("Products to include"),
    shipping_lines: z.array(z.record(z.unknown())).optional(),
    coupon_lines: z.array(z.object({ code: z.string() })).optional(),
    customer_note: z.string().optional().describe("Note visible to customer"),
  })
  .passthrough();

export function registerOrderTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_orders_list",
    {
      title: "List orders",
      description:
        "Lists store orders with pagination and optional filters for status, date range, and customer. Default detail=summary uses a slim `_fields` projection to cut tokens/memory — use detail=full or woo_orders_get for complete addresses/meta. Returns order objects plus pagination metadata.",
      inputSchema: {
        ...PaginationInputSchema.shape,
        status: z
          .string()
          .optional()
          .describe(
            "Order status or comma-separated list. Example: processing,completed",
          ),
        customer: z
          .number()
          .optional()
          .describe("Filter by customer ID. Example: 12"),
        after: z
          .string()
          .optional()
          .describe("ISO8601 date — only orders after this. Example: 2024-01-01T00:00:00"),
        before: z
          .string()
          .optional()
          .describe("ISO8601 date — only orders before this"),
        product: z.number().optional().describe("Filter orders containing product ID"),
        orderby: z
          .enum(["date", "id", "include", "title", "slug"])
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
          ORDER_SUMMARY_FIELDS,
        );
        const res = await client.get<unknown[]>("orders", {
          page,
          per_page,
          status: args.status,
          customer: args.customer,
          after: args.after,
          before: args.before,
          product: args.product,
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
          OrderSchema,
        );
        return textContent(out);
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_orders_get",
    {
      title: "Get order",
      description:
        "Retrieves a single order by ID including line items, billing/shipping, totals, and status history fields. Use this for support tickets, fulfillment, or when an order number is already known.",
      inputSchema: {
        id: z.number().int().positive().describe("Order ID. Example: 101"),
      },
    },
    async (args) => {
      try {
        const res = await client.get("orders", { id: args.id });
        return textContent(parseSingleOutput(res.data, OrderSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_orders_create",
    {
      title: "Create order",
      description:
        "Creates a new order with optional customer, line items, addresses, and payment fields. Use this to place orders on behalf of customers, seed test data, or automate checkout-like flows from an agent.",
      inputSchema: OrderCreateSchema.shape,
    },
    async (args) => {
      try {
        const res = await client.post("orders", args as Record<string, unknown>);
        return textContent(parseSingleOutput(res.data, OrderSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_orders_update",
    {
      title: "Update order",
      description:
        "Updates an existing order by ID (status changes, notes, addresses, line items). Use this for fulfillment transitions (e.g. processing → completed), address corrections, or partial refunds workflows that only need field updates.",
      inputSchema: {
        id: z.number().int().positive().describe("Order ID to update"),
        data: OrderCreateSchema.partial()
          .passthrough()
          .describe("Fields to update on the order"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(
          "orders",
          args.data as Record<string, unknown>,
          { id: args.id },
        );
        return textContent(parseSingleOutput(res.data, OrderSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_orders_delete",
    {
      title: "Delete order",
      description:
        "Deletes an order by ID. force=true permanently deletes; force=false moves to trash. Use carefully for test cleanup or GDPR-style removal when appropriate policies allow.",
      inputSchema: {
        id: z.number().int().positive().describe("Order ID to delete"),
        force: z.boolean().default(true).optional().describe("Permanent delete (default true)"),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          "orders",
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

  server.registerTool(
    "woo_orders_notes_list",
    {
      title: "List order notes",
      description:
        "Lists notes attached to a specific order (customer-visible and private staff notes). Use this when reviewing order history, support context, or audit trails for a single order.",
      inputSchema: {
        order_id: z.number().int().positive().describe("Order ID whose notes to list"),
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>(`orders/${args.order_id}/notes`, {
          page,
          per_page,
        });
        const meta = client.pagination(res, page, per_page);
        const out = parseListOutput(
          res.data,
          meta.currentPage,
          meta.perPage,
          meta.total,
          meta.totalPages,
          OrderNoteSchema,
        );
        return textContent(out);
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_orders_notes_create",
    {
      title: "Create order note",
      description:
        "Adds a note to an order. Set customer_note=true to show it to the customer (email may be triggered by WC). Use this to document support actions or notify customers of fulfillment updates.",
      inputSchema: {
        order_id: z.number().int().positive().describe("Order ID to attach the note to"),
        note: z.string().min(1).describe("Note text content"),
        customer_note: z
          .boolean()
          .optional()
          .describe("If true, note is customer-facing"),
      },
    },
    async (args) => {
      try {
        const res = await client.post(`orders/${args.order_id}/notes`, {
          note: args.note,
          customer_note: args.customer_note ?? false,
        });
        return textContent(parseSingleOutput(res.data, OrderNoteSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_orders_batch",
    {
      title: "Batch orders",
      description:
        "Runs multiple order create/update/delete operations in one batch request. Use this for bulk status updates (e.g. mark many orders completed) or mass test-data management while minimizing API calls.",
      inputSchema: BatchOperationSchema.shape,
    },
    async (args) => {
      try {
        const res = await client.post("orders/batch", args as Record<string, unknown>);
        return textContent(BatchResponseSchema.parse(res.data ?? {}));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_orders_refunds_list",
    {
      title: "List order refunds",
      description:
        "Lists refunds issued against a specific order. Use this for support lookups, finance reconciliation, or before creating another partial refund so you do not double-refund.",
      inputSchema: {
        order_id: z.number().int().positive().describe("Order ID whose refunds to list"),
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>(`orders/${args.order_id}/refunds`, {
          page,
          per_page,
        });
        const meta = client.pagination(res, page, per_page);
        const out = parseListOutput(
          res.data,
          meta.currentPage,
          meta.perPage,
          meta.total,
          meta.totalPages,
          OrderRefundSchema,
        );
        return textContent(out);
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_orders_refunds_get",
    {
      title: "Get order refund",
      description:
        "Retrieves a single refund by ID for an order, including amount, reason, and line items. Use when you have a refund ID from a list or webhook.",
      inputSchema: {
        order_id: z.number().int().positive().describe("Parent order ID"),
        id: z.number().int().positive().describe("Refund ID"),
      },
    },
    async (args) => {
      try {
        const res = await client.get(`orders/${args.order_id}/refunds/${args.id}`);
        return textContent(parseSingleOutput(res.data, OrderRefundSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_orders_refunds_create",
    {
      title: "Create order refund",
      description:
        "Creates a full or partial refund on an order. Prefer amount for simple money refunds; use line_items for item-level restocks. api_refund=true attempts payment gateway refund when supported. Use carefully — this mutates order money and may email the customer.",
      inputSchema: {
        order_id: z.number().int().positive().describe("Order ID to refund"),
        amount: z
          .string()
          .optional()
          .describe('Refund amount as string. Example: "10.00". Omit for full remaining refund when allowed.'),
        reason: z.string().optional().describe("Human-readable refund reason"),
        api_refund: z
          .boolean()
          .optional()
          .describe("If true, attempt gateway refund via payment API (default false)"),
        api_restock: z
          .boolean()
          .optional()
          .describe("If true, restock refunded line items when applicable"),
        line_items: z
          .array(
            z.object({
              id: z.number().describe("Order line item ID (not product ID)"),
              quantity: z.number().int().positive().optional().describe("Qty to refund"),
              refund_total: z
                .number()
                .optional()
                .describe("Line refund total (ex tax) as number"),
            }),
          )
          .optional()
          .describe("Optional per-line-item refund details"),
      },
    },
    async (args) => {
      try {
        const body: Record<string, unknown> = {};
        if (args.amount !== undefined) body.amount = args.amount;
        if (args.reason !== undefined) body.reason = args.reason;
        if (args.api_refund !== undefined) body.api_refund = args.api_refund;
        if (args.api_restock !== undefined) body.api_restock = args.api_restock;
        if (args.line_items !== undefined) body.line_items = args.line_items;
        const res = await client.post(`orders/${args.order_id}/refunds`, body);
        return textContent(parseSingleOutput(res.data, OrderRefundSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_orders_refunds_delete",
    {
      title: "Delete order refund",
      description:
        "Deletes a refund record from an order. force=true is required by WooCommerce for permanent delete. Use mainly for test cleanup; production finance policies often disallow removing refund history.",
      inputSchema: {
        order_id: z.number().int().positive().describe("Parent order ID"),
        id: z.number().int().positive().describe("Refund ID to delete"),
        force: z.boolean().default(true).optional().describe("Permanent delete (default true)"),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          `orders/${args.order_id}/refunds/${args.id}`,
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
