import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { server: "src/server.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "node18",
    outDir: "dist",
    splitting: false,
    shims: true,
    external: ["woocommerce-rest-ts-api", "@modelcontextprotocol/sdk", "zod"],
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    target: "node18",
    outDir: "dist",
    splitting: false,
    shims: true,
    banner: { js: "#!/usr/bin/env node" },
    external: ["woocommerce-rest-ts-api", "@modelcontextprotocol/sdk", "zod"],
  },
]);
