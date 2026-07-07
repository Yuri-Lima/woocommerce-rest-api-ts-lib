/**
 * Webhook tools — list, get, create, update, delete.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import {
  DeleteResponseSchema,
  PaginationInputSchema,
  WebhookSchema,
  parseListOutput,
  parseSingleOutput,
  textContent,
} from "../types.js";

const WebhookCreateSchema = z
  .object({
    name: z.string().optional().describe("Friendly webhook name"),
    status: z
      .enum(["active", "paused", "disabled"])
      .optional()
      .describe("Webhook status"),
    topic: z
      .string()
      .describe(
        "Event topic. Example: order.created, product.updated, customer.deleted",
      ),
    delivery_url: z
      .string()
      .url()
      .describe("HTTPS URL that receives the webhook payload"),
    secret: z.string().optional().describe("Optional signing secret"),
  })
  .passthrough();

export function registerWebhookTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_webhooks_list",
    {
      title: "List webhooks",
      description:
        "Lists configured WooCommerce webhooks with pagination. Use this to audit integrations, find broken delivery URLs, or inventory event subscriptions.",
      inputSchema: {
        ...PaginationInputSchema.shape,
        status: z
          .enum(["all", "active", "paused", "disabled"])
          .optional()
          .describe("Filter by webhook status"),
        search: z.string().optional().describe("Search webhook names"),
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("webhooks", {
          page,
          per_page,
          status: args.status,
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
            WebhookSchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_webhooks_get",
    {
      title: "Get webhook",
      description:
        "Retrieves a single webhook by ID including topic, delivery URL, and status. Use this when diagnosing a specific integration endpoint.",
      inputSchema: {
        id: z.number().int().positive().describe("Webhook ID"),
      },
    },
    async (args) => {
      try {
        const res = await client.get("webhooks", { id: args.id });
        return textContent(parseSingleOutput(res.data, WebhookSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_webhooks_create",
    {
      title: "Create webhook",
      description:
        "Creates a new webhook subscription for a topic and delivery URL. Use this to connect the store to external systems (ERP, Slack, custom services) on order/product/customer events.",
      inputSchema: WebhookCreateSchema.shape,
    },
    async (args) => {
      try {
        const res = await client.post("webhooks", args as Record<string, unknown>);
        return textContent(parseSingleOutput(res.data, WebhookSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_webhooks_update",
    {
      title: "Update webhook",
      description:
        "Updates an existing webhook by ID (status, URL, topic, name). Use this to pause/resume integrations or rotate delivery endpoints.",
      inputSchema: {
        id: z.number().int().positive().describe("Webhook ID"),
        data: WebhookCreateSchema.partial()
          .passthrough()
          .describe("Fields to update"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(
          "webhooks",
          args.data as Record<string, unknown>,
          { id: args.id },
        );
        return textContent(parseSingleOutput(res.data, WebhookSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_webhooks_delete",
    {
      title: "Delete webhook",
      description:
        "Deletes a webhook by ID. Use this to remove obsolete integrations or stop noisy event delivery. force=true permanently deletes.",
      inputSchema: {
        id: z.number().int().positive().describe("Webhook ID"),
        force: z.boolean().default(true).optional(),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          "webhooks",
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
