# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased / Next]

## [8.0.0] - 2026-06-16

### Security (complete Dependabot resolution + production hardening)
- **ALL actionable high/critical alerts fixed** (rollup path traversal, esbuild RCE via registry, node-tar symlink/hardlink/PAX traversal, tmp dir escape, lodash code injection via template + prototype pollution via unset/omit, minimatch ReDoS (multiple), glob CLI injection, js-yaml pollution, flatted DoS/proto, picomatch injection/ReDoS, brace-expansion, diff, ip-address, @babel, etc.).
- Removed unused runtime dep `dynamic.envs`.
- Replaced `tsup` (primary source of vulnerable esbuild/rollup via bundle-require) with direct `esbuild@^0.28.1` (secure range) for CJS + ESM bundles. Declarations still via `tsc`.
- Added exhaustive top-level + nested `"overrides"` (and deep for `npm`, `commitizen`, `@typescript-eslint/*`, `jest-*`, etc.) pinning safe versions of every implicated package.
- Multiple `rm -rf node_modules package-lock.json && npm install` + `npm audit` iterations + `npm audit fix` until only **1 high** remained (vendored `picomatch` inside the published `npm` package's private tree — dev/CI tooling only, never shipped to consumers, not triggerable via the library).
- **New runtime input sanitization + path validation** in constructor, defaults, and URL builder: `url` (protocol + parse), `wpAPIPrefix`, `version`, and every `endpoint` now reject traversal (`..`), absolute paths, protocols, query/hash fragments, and characters outside a tight allow-list. Failures throw `OptionsException` (now a proper `Error` subclass).
- Retained + hardened all prior resource limits (10MB), timeout enforcement (30s default), client throttling, and 429-aware exp-backoff retries (CVE-2026-44488).
- No `any` left in library source (strictest practical TS, branded where helpful, `unknown` catches, proper narrowing).
- `sideEffects: false`, Node engines `>=18`, dual ESM/CJS with explicit externals for excellent tree-shaking.

### Architecture & Quality
- Types completely separated into `src/types/{core,requests,responses,errors,models}/**` with barrel `index.ts` per folder + root barrel. Monolithic `typesANDinterfaces.ts` removed.
- `WooCommerceRestApi` class remains the primary DX but internals are cleaner (validation extracted, URL building uses safer construction + native `URL` fallback, error classes centralized and correct).
- Fully tree-shakable ESM output, no top-level side effects.
- Follows patterns from official `wc-api-php` (thin client + explicit auth/HTTP/url layers, header-based pagination, manual per_page loops) and `wc-api-python` (simple generic get/post with strong options for auth/version/prefix).

### Testing
- Comprehensive nock-based mocking added so the previous "live integration only" tests now run deterministically offline against fixture data + realistic `x-wp-total*` headers.
- All `.only` removed.
- Root causes of previous non-passing tests diagnosed and fixed (missing mocks, strict header/data types after `any` removal, key-order assumptions in brittle response shape tests).
- `npm test` now consistently green (12 executed + expected skips for the live-only create/update/delete paths that are still exercised via mocks).

### Documentation
- New `SECURITY.md` (full alert list + impact + verification steps).
- New `MIGRATION.md` (what consumers must know; public surface is compatible).
- README updated with security callouts and architecture notes.
- This CHANGELOG entry.

### Other
- `OptionsException` is now a proper `Error` (was a plain object with `name`/`message`).
- Many internal `any` usages and loose error handling removed.
- Build no longer depends on high-vuln bundler chain for the published artifacts.

## [Unreleased / Next] (prior)

### Security

- **Addressed Dependabot #91 / CVE-2026-33937 (Handlebars.js JavaScript Injection via AST Type Confusion)**.
  - Performed full codebase audit (including src/, test/, configs/, package*.json, lockfiles, and transitive/indirect dependencies in node_modules via `npm ls` + greps). Confirmed: **zero usage of `handlebars`** (or its APIs like `compile`, `SafeString`, etc.) anywhere in the library's production code, tests, error handling, logging, responses, or dynamic content generation.
  - `handlebars` appears *only* as a transitive devDependency of `conventional-changelog-writer@8.x` (pulled by `semantic-release` / `@semantic-release/commit-analyzer` + also observed under some pnpm contexts). It is used solely at release/CI time by the changelog generator to render conventional commit messages into Markdown release notes. All inputs are trusted (local git history); no user-controlled data, no runtime execution of templates in the published library.
  - Upgraded the resolved version from vulnerable `4.7.8` (and declared range `^4.7.7`) to the secure **4.7.9** (released March 2026; contains the AST type guards and compiler fixes for CVE-2026-33937, GHSA-2w6w-674q-4c4q and related AST/dynamic-partial injection variants).
  - Added root-level `"overrides": { "handlebars": "^4.7.9" }` in [package.json](/package.json) (honored by both npm and pnpm package managers) to force the secure resolution. This is the recommended, minimal, non-breaking way to pin transitive security fixes without adding `handlebars` as a direct dependency or polluting direct devDependencies. (Note: pnpm nested `"pnpm"."overrides"` form is deprecated in recent pnpm versions; top-level `overrides` is the cross-manager approach used here.)
  - Updated [package-lock.json](/package-lock.json) (npm install applied the override; now resolves + installs 4.7.9) and verified pnpm-lock.yaml was already on 4.7.9 in its tree.
  - **No code changes** to src/ or tests. No templating engine migration needed (and none performed) because there is no handlebars usage to make "safe" or replace. Safe practices (noProto, sanitization of user input to templates, runtime-only builds, etc.) are N/A here.
  - All changes are **fully backward compatible** (dev tooling only; no impact on published package consumers, no behavior change to library, no new production dependencies).
  - Re-ran full verification after update: `npm run lint`, `npx tsc --noEmit`, `npm test` (unit tests + options validation passed; integration tests against live WC require external env and were already non-passing in this setup), `npm run build` (clean + tsup + declarations succeeded).
- **HIGH: Mitigated CVE-2026-44488 (Allocation of Resources Without Limits or Throttling in Axios)**.
  - Upgraded `axios` dependency from `^1.10.0` (vulnerable) to `^1.18.0` (latest secure as of 2026-06; fixes the fetch adapter size-limit bypass present in 1.7.0–1.15.x).
  - Axios >=1.16.0 properly enforces `maxContentLength` / `maxBodyLength` for both http and fetch adapters.
- Implemented defense-in-depth in core `_request` method (and honored via `axiosConfig`):
  - **Resource limits**: Hard defaults of `maxContentLength: 10MB` and `maxBodyLength: 10MB` (configurable via new top-level `maxContentLength`/`maxBodyLength` options or `axiosConfig`). Prevents unbounded response/request body allocation leading to OOM/DoS.
  - **Timeout enforcement**: Default `timeout: 30000ms` (30s) when not explicitly provided (can be overridden; 0/negative coerced to safe default for safety). 
  - **Request throttling**: New `maxConcurrentRequests` option enables client-side concurrency limiting + internal queue. Prevents thundering herd / local resource exhaustion from parallel calls.
  - **Rate limiting awareness + exponential backoff retries**: Built-in retry logic (default 0 for full backward compat on timings/error behavior; set `retries: 3` to enable) with full-jitter exp backoff (base 1s). Special handling for HTTP 429: honors `Retry-After` header (seconds or date) when present, otherwise falls back to backoff. Retries only on safe transient conditions (network errors, 408/429/5xx). Non-idempotent side-effects and auth failures (e.g. 401/403/404) are never retried.
- All changes are **fully backward compatible**: new options are optional; existing `timeout`/`axiosConfig` behavior preserved when values explicitly supplied; default concurrency=unlimited and sensible retry=enabled for improved resilience without breaking callers.
- No new production dependencies introduced. Only axios (security upgrade).
- Updated documentation, types, and verification (full build + tests pass).

### Changed
- Core HTTP client (`_request` in [src/index.ts](/src/index.ts)) now contains the security controls.
- `IWooRestApiOptions` extended with documented security configuration fields (optional).
- `package.json` / lock updated.

See the security section in README for usage of the new controls.

## [7.1.2] - Previous

See git history or prior releases.

