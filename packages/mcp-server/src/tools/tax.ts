/**
 * Tax tools — rates and classes.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import {
  DeleteResponseSchema,
  PaginationInputSchema,
  TaxRateSchema,
  WcEntitySchema,
  parseListOutput,
  parseSingleOutput,
  textContent,
} from "../types.js";

const TaxRateCreateSchema = z
  .object({
    country: z.string().optional().describe("ISO country code. Example: US"),
    state: z.string().optional().describe("State code. Example: CA"),
    postcode: z.string().optional().describe("Postcode / ZIP"),
    city: z.string().optional().describe("City name"),
    rate: z.string().describe("Tax rate percentage as string. Example: \"8.5000\""),
    name: z.string().optional().describe("Tax name. Example: VAT"),
    priority: z.number().optional(),
    compound: z.boolean().optional(),
    shipping: z.boolean().optional().describe("Whether rate applies to shipping"),
    class: z.string().optional().describe("Tax class slug. Example: standard"),
  })
  .passthrough();

export function registerTaxTools(server: McpServer, client: WooClient): void {
  server.registerTool(
    "woo_tax_rates_list",
    {
      title: "List tax rates",
      description:
        "Lists configured tax rates with pagination and optional filters. Use this to audit regional tax setup or find rate IDs before updates.",
      inputSchema: {
        ...PaginationInputSchema.shape,
        class: z.string().optional().describe("Filter by tax class slug"),
        country: z.string().optional().describe("Filter by country code"),
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("taxes", {
          page,
          per_page,
          class: args.class,
          country: args.country,
        });
        const meta = client.pagination(res, page, per_page);
        return textContent(
          parseListOutput(
            res.data,
            meta.currentPage,
            meta.perPage,
            meta.total,
            meta.totalPages,
            TaxRateSchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_tax_rates_get",
    {
      title: "Get tax rate",
      description:
        "Retrieves a single tax rate by ID. Use this when you need the full rate record including location and class details.",
      inputSchema: {
        id: z.number().int().positive().describe("Tax rate ID"),
      },
    },
    async (args) => {
      try {
        const res = await client.get("taxes", { id: args.id });
        return textContent(parseSingleOutput(res.data, TaxRateSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_tax_rates_create",
    {
      title: "Create tax rate",
      description:
        "Creates a new tax rate for a location and optional tax class. Use this when expanding into new regions or adding reduced/zero rates.",
      inputSchema: TaxRateCreateSchema.shape,
    },
    async (args) => {
      try {
        const res = await client.post("taxes", args as Record<string, unknown>);
        return textContent(parseSingleOutput(res.data, TaxRateSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_tax_rates_update",
    {
      title: "Update tax rate",
      description:
        "Updates an existing tax rate by ID. Use this when tax legislation changes or location matching needs correction.",
      inputSchema: {
        id: z.number().int().positive().describe("Tax rate ID"),
        data: TaxRateCreateSchema.partial()
          .passthrough()
          .describe("Fields to update"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(
          "taxes",
          args.data as Record<string, unknown>,
          { id: args.id },
        );
        return textContent(parseSingleOutput(res.data, TaxRateSchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_tax_rates_delete",
    {
      title: "Delete tax rate",
      description:
        "Deletes a tax rate by ID. Use this to remove obsolete regional rates. force=true permanently deletes.",
      inputSchema: {
        id: z.number().int().positive().describe("Tax rate ID"),
        force: z.boolean().default(true).optional(),
      },
    },
    async (args) => {
      try {
        const res = await client.delete(
          "taxes",
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
    "woo_tax_classes_list",
    {
      title: "List tax classes",
      description:
        "Lists tax classes (standard, reduced-rate, zero-rate, and custom). Use this when assigning tax classes to products or configuring class-specific rates.",
      inputSchema: {
        ...PaginationInputSchema.shape,
      },
    },
    async (args) => {
      try {
        const page = args.page ?? 1;
        const per_page = args.per_page ?? 10;
        const res = await client.get<unknown[]>("taxes/classes", {
          page,
          per_page,
        });
        const meta = client.pagination(res, page, per_page);
        const items = Array.isArray(res.data) ? res.data : [];
        return textContent(
          parseListOutput(
            items,
            meta.currentPage,
            meta.perPage,
            meta.total || items.length,
            meta.totalPages,
            WcEntitySchema,
          ),
        );
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_tax_classes_get",
    {
      title: "Get tax class",
      description:
        "Retrieves a tax class by slug. Use this to confirm a class exists before assigning it to products or rates.",
      inputSchema: {
        slug: z
          .string()
          .min(1)
          .describe("Tax class slug. Example: reduced-rate"),
      },
    },
    async (args) => {
      try {
        // WC API uses slug in path for tax classes
        const res = await client.get(`taxes/classes/${args.slug}`);
        // May return array or object depending on WC version
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        return textContent(parseSingleOutput(data, WcEntitySchema));
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );
}
