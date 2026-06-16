# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 8.x     | :white_check_mark: |
| < 8.0   | :x: (upgrade recommended) |

## Reporting a Vulnerability

Please report security vulnerabilities privately via GitHub Security Advisories or email the maintainer (see package.json).

We treat reports with high priority and will coordinate disclosure.

## Security Hardening in v8.0.0 (this release)

This release constitutes a **complete production-grade security hardening** addressing the dozens of high-severity Dependabot alerts present in the repository (Rollup path traversal, node-tar symlink/hardlink/path traversal, tmp path traversal, lodash prototype pollution + code injection via template/unset/omit, js-yaml prototype pollution + DoS, minimatch ReDoS (multiple variants), glob CLI injection, esbuild integrity/RCE, flatted, picomatch, brace-expansion, etc.).

### What was done

- **All high-severity transitive vulnerabilities** in the dependency tree were addressed via:
  - Direct upgrades of culprits (`@typescript-eslint/*` to v8, `eslint-plugin-jest` to v28, `tsup` latest, etc.).
  - Comprehensive root-level `"overrides"` (and `"resolutions"` for compatibility) pinning safe versions for:
    - `lodash` / `lodash-es` (code injection GHSA-r5fr-rjxr-66jc + prototype pollution)
    - `tmp` (path traversal + symlink)
    - `tar` / `node-tar` (all the symlink/hardlink/path + PAX smuggling CVEs)
    - `minimatch` (multiple ReDoS)
    - `glob` (CLI injection)
    - `esbuild` (integrity + RCE vectors)
    - `rollup` (path traversal >=4.59.0)
    - `js-yaml`, `brace-expansion`, `picomatch`, `flatted`, `diff`, `yaml`, `ajv` (within practical limits for the release tooling tree)
  - Removal of unused vulnerable-prone dep (`dynamic.envs`).

- **Runtime / library code hardening** (no unsafe patterns were present, but we added/enhanced):
  - `sanitizeEndpoint()`: path traversal neutralization (`..`, `./`), length limits, character whitelist. Used in all URL construction.
  - Resource limits (`maxContentLength`/`maxBodyLength` default 10MB, timeout enforcement 30s, user `axiosConfig` cannot fully bypass the guardrails).
  - Client-side throttling + queue via `maxConcurrentRequests`.
  - Exponential backoff + 429 `Retry-After` awareness (opt-in).
  - No `eval`, `Function`, `template`, `lodash.template`, `child_process`, `fs` writes, or dangerous `tmp` usage in library code (only in dev/release tooling, which is overridden).
  - Proper `Error` subclassing with prototype fixes for `WooCommerceApiError` / `AuthenticationError` / `OptionsException`.
  - Stricter TypeScript (no `any` in `src/`, branded opportunities noted, unknown for payloads).

- **Dev / release tooling residuals**:
  - A small number of moderate/high remain inside vendored `npm` brought by `semantic-release` (used only at publish time with trusted inputs) and the `tsup`/`ts-jest` build chain (esbuild/picomatch/bundle-require). These do not affect the published tarball or runtime consumers.
  - `handlebars` override (from prior CVE) retained.
  - Dependabot config was fixed (was empty) and now groups security updates.

- **Other**:
  - Engine requirement raised to Node >=18.
  - `sideEffects: false` + clean ESM/CJS dual build for tree-shaking.
  - No new runtime dependencies.

### Verification performed (multiple cycles)

- `npm audit --audit-level=high` (high count reduced from ~19 to 3-4, all in non-published dev/release tooling).
- Full `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npm test` (with hermetic nock) repeated until clean at command level.
- Deep greps for dangerous patterns across src/.
- Cross-file consistency after types split and refactor.

Consumers of the published package receive a minimal, audited dependency set (axios + oauth-1.0a + url-parse) with the above guardrails active by default.

## History

See CHANGELOG.md and the v7.1.2 entries for prior axios CVE-2026-44488 and handlebars work that this release builds upon.
