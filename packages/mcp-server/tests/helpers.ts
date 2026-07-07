/**
 * Shared test helpers for MCP server unit/integration tests.
 */

import nock from "nock";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, type CreatedServer } from "../src/server.js";
import type { McpConfig } from "../src/config.js";

export const TEST_BASE = "https://woo-test.example";

export function testConfig(overrides: Partial<McpConfig> = {}): McpConfig {
  return {
    WC_URL: TEST_BASE,
    WC_KEY: "ck_test_key_1234567890",
    WC_SECRET: "cs_test_secret_1234567890",
    WC_VERSION: "wc/v3",
    WC_RATE_LIMIT_PER_SECOND: 100, // fast in tests
    WC_QUERY_STRING_AUTH: true,
    ...overrides,
  };
}

export function apiPath(suffix = ""): string {
  return `/wp-json/wc/v3${suffix}`;
}

/**
 * nock scope for the test store (query-string auth).
 */
export function wooScope(): nock.Scope {
  return nock(TEST_BASE).persist(false);
}

export interface McpTestContext {
  mcp: CreatedServer;
  client: Client;
  cleanup: () => Promise<void>;
}

/**
 * Spin up in-memory MCP server + client pair.
 */
export async function createMcpTestContext(
  config: McpConfig = testConfig(),
): Promise<McpTestContext> {
  const mcp = createServer({ config });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await mcp.server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);

  return {
    mcp,
    client,
    cleanup: async () => {
      await client.close().catch(() => undefined);
      await mcp.server.close().catch(() => undefined);
      nock.cleanAll();
    },
  };
}

export function parseToolJson(result: {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}): unknown {
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (!text) return result;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
) {
  const result = await client.callTool({ name, arguments: args });
  return {
    raw: result,
    data: parseToolJson(result as never),
    isError: Boolean((result as { isError?: boolean }).isError),
  };
}
