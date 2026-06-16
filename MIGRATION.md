# Migration Guide

## From <8.0 to 8.0+ (Security + Architecture Overhaul)

**Public API is backward compatible.** All named exports (`WooCommerceRestApi`, `Products`, `WooCommerceApiError`, `get`, `createProduct`, `IWooRestApiOptions`, etc.) and runtime behavior for existing options continue to work.

### Breaking / Notable Changes (mostly internal or stricter)

- **Type locations**: Types are now organized under `src/types/{core,requests,responses,errors,models}/index.ts` with a root `src/types/index.ts` barrel.  
  If you were deep-importing from the old `typesANDinterfaces` (not a public pattern), update to the new barrels or just import from the package root (recommended).

- **Error classes are now real `Error` subclasses** (`OptionsException extends Error`, proper `name` + stack). Previously `OptionsException` was a plain object. `instanceof` and `catch` continue to work; `name` is now consistent (`"OptionsException"`).

- **Stricter constructor validation** (security): `url`, `wpAPIPrefix`, `version`, and `endpoint` values are now sanitized. Passing values containing `..`, protocols, absolute paths, or illegal characters will throw `OptionsException` at construction or call time. Valid values like `version: "wc/v3"` and `endpoint: "products/attributes"` are unchanged.

- **Fewer `any` / stricter response types**: `WooCommerceApiResponse<T>["headers"]` is now `Record<...>` (was `any`). Tests and user code doing loose header access may need casts in TS (common in test code).

- **Build changes** (no consumer impact): We no longer depend on `tsup` at build time (removed a major source of high severity vulns). We use direct `esbuild` for the CJS/ESM bundles + `tsc --emitDeclarationOnly`. The published shape (dual format + types) is identical.

- **Dev-only remaining alert**: `npm audit` will still surface 1 high inside `node_modules/npm/node_modules/picomatch` (vendored copy used by the `npm` CLI and release tooling). This is **not** reachable from the library, not present after `npm install woocommerce-rest-ts-api`, and is called out in `SECURITY.md`.

- **Engines**: Now requires Node >=18 (was >=14). Modern LTS only.

- **No lodash / tmp / unsafe patterns** were present in runtime code before or after; none were introduced.

### Recommended actions

1. `npm install woocommerce-rest-ts-api@latest`
2. Run your type-checker (`tsc --noEmit`).
3. If you hand-craft `version`/`wpAPIPrefix`/`endpoint` values from untrusted input, validate them (or let the library throw -- the exception is now more descriptive).
4. Update any CI that runs `npm audit --audit-level=high` to either ignore the single vendored-in-npm item or run `npm audit --omit=dev` for production dependency checks.

All security fixes from v7.1.2 (axios resource limits, retries, throttling, handlebars override) are retained and expanded.

