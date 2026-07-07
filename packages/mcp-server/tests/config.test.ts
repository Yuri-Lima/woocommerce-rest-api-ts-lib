import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  const valid = {
    WC_URL: "https://store.example.com",
    WC_KEY: "ck_abc",
    WC_SECRET: "cs_xyz",
  };

  it("loads valid config with defaults", () => {
    const cfg = loadConfig(valid);
    expect(cfg.WC_URL).toBe("https://store.example.com");
    expect(cfg.WC_KEY).toBe("ck_abc");
    expect(cfg.WC_SECRET).toBe("cs_xyz");
    expect(cfg.WC_VERSION).toBe("wc/v3");
    expect(cfg.WC_RATE_LIMIT_PER_SECOND).toBe(5);
    expect(cfg.WC_QUERY_STRING_AUTH).toBe(false);
  });

  it("parses optional rate limit and query string auth", () => {
    const cfg = loadConfig({
      ...valid,
      WC_RATE_LIMIT_PER_SECOND: "10",
      WC_QUERY_STRING_AUTH: "true",
      WC_VERSION: "wc/v2",
    });
    expect(cfg.WC_RATE_LIMIT_PER_SECOND).toBe(10);
    expect(cfg.WC_QUERY_STRING_AUTH).toBe(true);
    expect(cfg.WC_VERSION).toBe("wc/v2");
  });

  it("fails immediately when WC_URL is missing", () => {
    expect(() =>
      loadConfig({ WC_KEY: "ck", WC_SECRET: "cs" } as NodeJS.ProcessEnv),
    ).toThrow(/WC_URL/);
  });

  it("fails when WC_KEY is missing", () => {
    expect(() =>
      loadConfig({
        WC_URL: "https://x.com",
        WC_SECRET: "cs",
      } as NodeJS.ProcessEnv),
    ).toThrow(/WC_KEY/);
  });

  it("fails when WC_SECRET is missing", () => {
    expect(() =>
      loadConfig({
        WC_URL: "https://x.com",
        WC_KEY: "ck",
      } as NodeJS.ProcessEnv),
    ).toThrow(/WC_SECRET/);
  });

  it("fails on invalid URL", () => {
    expect(() =>
      loadConfig({
        WC_URL: "not-a-url",
        WC_KEY: "ck",
        WC_SECRET: "cs",
      }),
    ).toThrow(/valid URL/);
  });

  it("includes Claude Desktop setup help in error message", () => {
    try {
      loadConfig({});
      fail("expected throw");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/WC_URL/);
      expect(msg).toMatch(/claude|mcpServers|npx/i);
    }
  });
});
