/**
 * System status tools — store health, environment, database, plugins.
 * Default responses are slimmed: full system_status payloads are often 50–200KB+
 * (plugins × meta, theme, pages) and dominate MCP context when agents only need
 * version/security health checks.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WooClient } from "../client.js";
import { toMcpToolError } from "../errors.js";
import { textContent, WcEntitySchema } from "../types.js";

const SystemStatusSchema = z
  .object({
    environment: z.record(z.unknown()).optional(),
    database: z.record(z.unknown()).optional(),
    active_plugins: z.array(z.unknown()).optional(),
    theme: z.record(z.unknown()).optional(),
    settings: z.record(z.unknown()).optional(),
    security: z.record(z.unknown()).optional(),
    pages: z.array(z.unknown()).optional(),
  })
  .passthrough();

const STATUS_SECTIONS = [
  "environment",
  "database",
  "active_plugins",
  "theme",
  "settings",
  "security",
  "pages",
] as const;

type StatusSection = (typeof STATUS_SECTIONS)[number];

/** High-signal environment keys for summary mode (drops dozens of rarely needed flags). */
const ENV_SUMMARY_KEYS = [
  "home_url",
  "site_url",
  "version",
  "wp_version",
  "php_version",
  "mysql_version",
  "mysql_version_string",
  "wc_version",
  "server_info",
  "memory_limit",
  "max_execution_time",
  "wp_memory_limit",
  "wp_debug_mode",
  "wp_cron",
  "language",
  "external_object_cache",
] as const;

function pickRecord(
  source: Record<string, unknown> | undefined,
  keys: readonly string[],
): Record<string, unknown> | undefined {
  if (!source) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in source) out[k] = source[k];
  }
  return Object.keys(out).length ? out : undefined;
}

function slimPlugin(plugin: unknown): unknown {
  if (!plugin || typeof plugin !== "object") return plugin;
  const p = plugin as Record<string, unknown>;
  return {
    plugin: p.plugin,
    name: p.name,
    version: p.version,
    version_latest: p.version_latest,
    author_name: p.author_name,
    network_activated: p.network_activated,
  };
}

function slimTheme(theme: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!theme) return undefined;
  return {
    name: theme.name,
    version: theme.version,
    version_latest: theme.version_latest,
    author_url: theme.author_url,
    is_child_theme: theme.is_child_theme,
    has_woocommerce_support: theme.has_woocommerce_support,
    has_woocommerce_file: theme.has_woocommerce_file,
    has_outdated_templates: theme.has_outdated_templates,
  };
}

/**
 * Project system status for summary mode — keeps health-check signal,
 * drops plugin meta blobs, full theme trees, and page lists unless requested.
 */
export function slimSystemStatus(
  raw: Record<string, unknown>,
  sections?: StatusSection[],
): Record<string, unknown> {
  const want = new Set<StatusSection>(
    sections?.length ? sections : ["environment", "database", "active_plugins", "theme", "security"],
  );
  const out: Record<string, unknown> = {};

  if (want.has("environment")) {
    out.environment = pickRecord(
      raw.environment as Record<string, unknown> | undefined,
      ENV_SUMMARY_KEYS,
    );
  }
  if (want.has("database")) {
    const db = raw.database as Record<string, unknown> | undefined;
    if (db) {
      out.database = {
        wc_database_version: db.wc_database_version,
        database_prefix: db.database_prefix,
        maxmind_geoip_database: db.maxmind_geoip_database,
        database_size: db.database_size,
        // Omit per-table rows — often the largest section on big stores.
      };
    }
  }
  if (want.has("active_plugins")) {
    const plugins = raw.active_plugins;
    out.active_plugins = Array.isArray(plugins) ? plugins.map(slimPlugin) : plugins;
  }
  if (want.has("theme")) {
    out.theme = slimTheme(raw.theme as Record<string, unknown> | undefined);
  }
  if (want.has("settings")) {
    const settings = raw.settings as Record<string, unknown> | undefined;
    if (settings) {
      out.settings = {
        currency: settings.currency,
        currency_symbol: settings.currency_symbol,
        currency_position: settings.currency_position,
        number_of_decimals: settings.number_of_decimals,
        thousand_separator: settings.thousand_separator,
        decimal_separator: settings.decimal_separator,
        taxonomies: settings.taxonomies,
        product_visibility_terms: undefined,
        woocommerce_api_enabled: settings.woocommerce_api_enabled,
        woocommerce_calc_taxes: settings.woocommerce_calc_taxes,
        force_ssl: settings.force_ssl,
      };
      // Drop undefined keys from the slim object
      for (const [k, v] of Object.entries(out.settings as Record<string, unknown>)) {
        if (v === undefined) delete (out.settings as Record<string, unknown>)[k];
      }
    }
  }
  if (want.has("security")) {
    out.security = raw.security;
  }
  if (want.has("pages")) {
    // Pages array is large; summary only returns count + missing flags if present.
    const pages = raw.pages;
    if (Array.isArray(pages)) {
      out.pages_summary = {
        count: pages.length,
        missing: pages
          .filter((p) => {
            const page = p as Record<string, unknown>;
            return page.page_set === false || page.page_exists === false;
          })
          .map((p) => {
            const page = p as Record<string, unknown>;
            return { page_name: page.page_name, page_id: page.page_id };
          }),
      };
    }
  }

  return out;
}

export function registerSystemStatusTools(
  server: McpServer,
  client: WooClient,
): void {
  server.registerTool(
    "woo_system_status_get",
    {
      title: "Get system status",
      description:
        "Fetches WooCommerce system status (environment, database, plugins, theme, security). Default detail=summary returns a slim health report suitable for agents; use detail=full for the complete payload (often 50–200KB+). Optionally pass `sections` to include only specific top-level keys.",
      inputSchema: {
        detail: z
          .enum(["summary", "full"])
          .default("summary")
          .describe(
            'Payload detail. "summary" (default) projects high-signal fields; "full" returns the raw WooCommerce report.',
          ),
        sections: z
          .array(z.enum(STATUS_SECTIONS))
          .optional()
          .describe(
            "Optional subset of top-level sections to include. Example: [\"environment\",\"security\"]",
          ),
      },
    },
    async (args) => {
      try {
        const res = await client.get("system_status");
        const parsed = SystemStatusSchema.parse(res.data ?? {}) as Record<
          string,
          unknown
        >;
        const detail = args.detail ?? "summary";
        const sections = args.sections as StatusSection[] | undefined;
        let item: Record<string, unknown>;
        if (detail === "full") {
          if (sections?.length) {
            item = {};
            for (const s of sections) {
              if (s in parsed) item[s] = parsed[s];
            }
          } else {
            item = parsed;
          }
        } else {
          item = slimSystemStatus(parsed, sections);
        }
        return textContent({
          item,
          detail,
          ...(sections?.length ? { sections } : {}),
        });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_system_status_tools_list",
    {
      title: "List system status tools",
      description:
        "Lists available WooCommerce system tools (clear transients, recount terms, regenerate thumbnails, etc.). Use this to discover maintenance actions before running one.",
      inputSchema: {},
    },
    async () => {
      try {
        const res = await client.get<unknown[]>("system_status/tools");
        const items = Array.isArray(res.data) ? res.data : [];
        WcEntitySchema.array().parse(items.length ? items : [{ id: 0 }]);
        return textContent({ items });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );

  server.registerTool(
    "woo_system_status_tools_run",
    {
      title: "Run system status tool",
      description:
        "Runs a WooCommerce system maintenance tool by ID (e.g. clear_transients). Use this only when the user explicitly requests a maintenance action — these can be destructive or slow on large stores.",
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe("Tool ID. Example: clear_transients"),
      },
    },
    async (args) => {
      try {
        const res = await client.put(`system_status/tools/${args.id}`, {
          confirm: true,
        });
        return textContent({ item: res.data });
      } catch (err) {
        return toMcpToolError(err);
      }
    },
  );
}
