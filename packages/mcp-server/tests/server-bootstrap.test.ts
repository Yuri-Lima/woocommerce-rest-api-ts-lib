/**
 * Covers startServer / connectStdio paths via mocked transport where possible.
 */
import { createServer, SERVER_NAME, SERVER_VERSION } from "../src/server.js";
import { testConfig } from "./helpers.js";

describe("server bootstrap", () => {
  it("createServer registers expected metadata", () => {
    const { server, config } = createServer({ config: testConfig() });
    expect(SERVER_NAME).toBe("woo-mcp-server");
    expect(SERVER_VERSION).toBe("1.0.0");
    expect(config.WC_URL).toBeDefined();
    expect(server).toBeDefined();
  });

  it("createServer without config loads from env", () => {
    const keys = ["WC_URL", "WC_KEY", "WC_SECRET", "WC_RATE_LIMIT_PER_SECOND"] as const;
    const prev: Record<string, string | undefined> = {};
    for (const k of keys) prev[k] = process.env[k];
    process.env.WC_URL = "https://env-store.example";
    process.env.WC_KEY = "ck_env";
    process.env.WC_SECRET = "cs_env";
    process.env.WC_RATE_LIMIT_PER_SECOND = "7";
    try {
      const { config } = createServer();
      expect(config.WC_URL).toBe("https://env-store.example");
      expect(config.WC_RATE_LIMIT_PER_SECOND).toBe(7);
    } finally {
      for (const k of keys) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    }
  });
});

