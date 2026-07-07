/**
 * CLI entrypoint for `woo-mcp-server` / `npx woo-mcp-server`.
 * Validates env and starts the MCP server on STDIO.
 */

import { startServer } from "./server.js";

startServer().catch((err) => {
  console.error(
    err instanceof Error ? err.message : `Fatal error: ${String(err)}`,
  );
  process.exit(1);
});
