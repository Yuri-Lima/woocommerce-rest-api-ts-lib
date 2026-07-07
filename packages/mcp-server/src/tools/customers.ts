/**
 * Customer tools — list, get, create, update, delete, search.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import {
  CustomerSchema,
  DeleteResponseSchema,
  PaginationInputSchema,
  parseListOutput,
  parseSingleOutput,
  textContent,
} from "../types.js";

const CustomerCreateSchema = z
  .object({
    email: z.string().email().describe("Customer email. Example: jane@example.com"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    username: z.string().optional().describe("Login username"),
    password: z.string().optional().describe("Account password (create only)"),
    billing: z.record(z.unknown()).optional().describe("Billing address"),
    shipping: z.record(z.unknown()).optional().describe("Shipping address"),
  })
  .passthrough();

export function registerCustomerTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_customers_list",
    {
      title: "List customers",
      description:
        "Lists WooCommerce customers with pagination. Use this for CRM-style overviews, segmenting audiences, or finding accounts before creating orders. Returns customer objects and pagination metadata.",
      inputSchema: {
        ...PaginationInputSchema.shape,
        role: z.string().optional().describe("Filter by role, e.g. customer"),
        email: z.string().optional().describe("Filter by exact email"),
        orderby: z
          .enum(["id", "include", "name", "registered_date"])
          .optional()
          .describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("customers", {
          page,
          per_page,
          role: args.role,
          email: args.email,
          orderby: args.orderby,
          order: args.order,
        });
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total,
            meta.totalPages,
            CustomerSchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_customers_get",
    {
      title: "Get customer",
      description:
        "Retrieves a single customer by ID including billing/shipping and meta. Use this when you have a customer ID from an order or search and need full account details.",
      inputSchema: {
        id: z.number().int().positive().describe("Customer ID"),
      },
    },
    async (args) => {
      try {
        const res = await client.get("customers", { id: args.id });
        return textContent(parseSingleOutput(res.data, CustomerSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_customers_create",
    {
      title: "Create customer",
      description:
        "Creates a new customer account with email and optional name, addresses, and password. Use this to onboard users from an agent workflow or seed demo accounts.",
      inputSchema: CustomerCreateSchema.shape,
    },
    async (args) => {
      try {
        const res = await client.post("customers", args as Record<string, unknown>);
        return textContent(parseSingleOutput(res.data, CustomerSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_customers_update",
    {
      title: "Update customer",
      description:
        "Updates an existing customer by ID. Use this to fix addresses, names, or billing details without recreating the account.",
      inputSchema: {
        id: z.number().int().positive().describe("Customer ID"),
        data: CustomerCreateSchema.partial()
          .passthrough()
          .describe("Fields to update"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(
          "customers",
          args.data as Record<string, unknown>,
          { id: args.id },
        );
        return textContent(parseSingleOutput(res.data, CustomerSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_customers_delete",
    {
      title: "Delete customer",
      description:
        "Deletes a customer by ID. force=true is required by WooCommerce for permanent deletion. Use for GDPR erasure or test cleanup only when authorized.",
      inputSchema: {
        id: z.number().int().positive().describe("Customer ID"),
        force: z.boolean().default(true).optional().describe("Must be true to delete"),
        reassign: z
          .number()
          .optional()
          .describe("User ID to reassign posts to (optional)"),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          "customers",
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
    "woo_customers_search",
    {
      title: "Search customers",
      description:
        "Searches customers by free-text query (name, email, username). Use this when the user provides a partial name or email and you need matching accounts before acting on orders.",
      inputSchema: {
        query: z.string().min(1).describe("Search query. Example: \"jane@\""),
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("customers", {
          search: args.query,
          page,
          per_page,
        });
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total,
            meta.totalPages,
            CustomerSchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );
}
