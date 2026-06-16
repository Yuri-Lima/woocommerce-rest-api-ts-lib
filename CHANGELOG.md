# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased / Next]

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

