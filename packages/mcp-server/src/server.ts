/**
 * WooCommerce MCP server bootstrap (STDIO transport).
 *
 * Creates a configured McpServer, wires the WooCommerce client, and registers
 * all tools/resources/prompts. The CLI entrypoint connects STDIO transport.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, type McpConfig } from "./config.js";
import { createWooClient, type WooClient } from "./client.js";
import { registerAll } from "./registry.js";

export const SERVER_NAME = "woo-mcp-server";
export const SERVER_VERSION = "1.0.0";

export interface CreateServerOptions {
  /** Pre-validated config; if omitted, loaded from process.env */
  config?: McpConfig;
  /** Inject a pre-built client (tests) */
  client?: WooClient;
}

export interface CreatedServer {
  server: McpServer;
  client: WooClient;
  config: McpConfig;
}

/**
 * Build an MCP server instance with all capabilities registered.
 * Does not connect transport — call connectStdio() or use startServer().
 */
export function createServer(options: CreateServerOptions = {}): CreatedServer {
  const config = options.config ?? loadConfig();
  const client = options.client ?? createWooClient(config);

  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerAll(server, client);

  return { server, client, config };
}

/**
 * Connect the server to STDIO transport (Claude Desktop compatible).
 */
export async function connectStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Full startup: validate env, create server, connect STDIO.
 * Exits process with code 1 on configuration failure.
 */
export async function startServer(): Promise<CreatedServer> {
  let created: CreatedServer;
  try {
    created = createServer();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Write to stderr so STDIO protocol stdout stays clean
    console.error(message);
    process.exit(1);
  }

  await connectStdio(created.server);
  return created;
}

export { loadConfig, createWooClient, registerAll };
export {
  ModelUsageTracker,
  usageSession,
  estimateTokensFromText,
  buildToolPayloadUsage,
} from "./usage.js";
export type { McpConfig, WooClient };
export type {
  ModelUsageReport,
  ModelUsageTotals,
  ModelRoundUsage,
  SessionToolUsage,
  ToolPayloadUsage,
} from "./usage.js";
