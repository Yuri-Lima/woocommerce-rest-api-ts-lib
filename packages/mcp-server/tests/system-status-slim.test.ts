import { slimSystemStatus } from "../src/tools/system-status.js";

describe("slimSystemStatus", () => {
  const fat: Record<string, unknown> = {
    environment: {
      home_url: "http://localhost",
      version: "9.0.0",
      wp_version: "6.5",
      php_version: "8.2",
      rarely_needed_flag_a: true,
      rarely_needed_flag_b: false,
      long_path_info: "/var/www/html/wp-content/plugins/woocommerce",
    },
    database: {
      wc_database_version: "9.0.0",
      database_prefix: "wp_",
      database_tables: {
        wp_posts: { data: "10MB", index: "2MB" },
        wp_postmeta: { data: "50MB", index: "20MB" },
      },
    },
    active_plugins: [
      {
        plugin: "woocommerce/woocommerce.php",
        name: "WooCommerce",
        version: "9.0.0",
        version_latest: "9.0.0",
        author_name: "Automattic",
        network_activated: false,
        author_url: "https://woocommerce.com",
        plugin_uri: "https://woocommerce.com",
      },
    ],
    theme: {
      name: "Storefront",
      version: "4.5",
      version_latest: "4.5",
      author_url: "https://woocommerce.com",
      is_child_theme: false,
      has_woocommerce_support: true,
      has_woocommerce_file: true,
      has_outdated_templates: false,
      file_headers: { huge: "blob" },
    },
    security: { secure_connection: true, hide_errors: true },
    pages: [
      { page_name: "Shop", page_id: 1, page_set: true, page_exists: true },
      { page_name: "Cart", page_id: 0, page_set: false, page_exists: false },
    ],
    settings: {
      currency: "USD",
      currency_symbol: "$",
      product_visibility_terms: { huge: true },
    },
  };

  it("drops low-signal environment keys and table rows", () => {
    const slim = slimSystemStatus(fat);
    const env = slim.environment as Record<string, unknown>;
    expect(env.version).toBe("9.0.0");
    expect(env.rarely_needed_flag_a).toBeUndefined();
    expect(env.long_path_info).toBeUndefined();

    const db = slim.database as Record<string, unknown>;
    expect(db.wc_database_version).toBe("9.0.0");
    expect(db.database_tables).toBeUndefined();
  });

  it("slims plugins; pages only when requested", () => {
    const slim = slimSystemStatus(fat);
    const plugins = slim.active_plugins as Array<Record<string, unknown>>;
    expect(plugins[0]).toMatchObject({ name: "WooCommerce", version: "9.0.0" });
    expect(plugins[0].plugin_uri).toBeUndefined();
    // Default summary omits pages to keep the health report small.
    expect(slim.pages).toBeUndefined();
    expect(slim.pages_summary).toBeUndefined();

    const withPages = slimSystemStatus(fat, ["pages"]);
    expect(withPages.pages_summary).toMatchObject({
      count: 2,
      missing: [{ page_name: "Cart", page_id: 0 }],
    });
  });

  it("is substantially smaller than the raw payload", () => {
    // Simulate a realistic fat report with many plugins
    const manyPlugins = {
      ...fat,
      active_plugins: Array.from({ length: 40 }, (_, i) => ({
        plugin: `plugin-${i}/plugin.php`,
        name: `Plugin ${i}`,
        version: "1.0.0",
        version_latest: "1.0.0",
        author_name: "Author",
        network_activated: false,
        author_url: "https://example.com/" + "x".repeat(80),
        plugin_uri: "https://example.com/plugin/" + "y".repeat(80),
        description: "d".repeat(200),
      })),
      database: {
        ...((fat.database as object) ?? {}),
        database_tables: Object.fromEntries(
          Array.from({ length: 80 }, (_, i) => [
            `wp_table_${i}`,
            { data: "1MB", index: "0.5MB", engine: "InnoDB" },
          ]),
        ),
      },
    };
    const rawSize = JSON.stringify(manyPlugins).length;
    const slimSize = JSON.stringify(slimSystemStatus(manyPlugins)).length;
    expect(slimSize).toBeLessThan(rawSize * 0.35);
  });

  it("respects sections filter", () => {
    const slim = slimSystemStatus(fat, ["environment", "security"]);
    expect(slim.environment).toBeDefined();
    expect(slim.security).toBeDefined();
    expect(slim.active_plugins).toBeUndefined();
    expect(slim.database).toBeUndefined();
  });
});
