# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 8.x     | :white_check_mark: |
| < 8.0   | :x:                |

## Reporting a Vulnerability

Please report security issues privately via GitHub Security Advisories or email the maintainer (see package.json).

We treat the following with highest priority:
- Path traversal or arbitrary file access via URL/endpoint construction
- Dependency supply-chain attacks in the published tarball (we have none; only 3 tiny runtime deps)
- Prototype pollution or code injection via options / query handling
- Resource exhaustion (we enforce limits + retries + throttling since v7.1.2)

## Hardening Summary (this release)

**All high-severity Dependabot alerts addressed** (rollup path traversal, esbuild RCE, node-tar symlink/hardlink traversal, tmp path traversal, lodash template injection + unset/omit proto pollution, minimatch ReDoS, glob CLI injection, js-yaml pollution, flatted, picomatch, etc.).

- Removed dead `dynamic.envs` runtime dep.
- Replaced `tsup` (pulled vulnerable esbuild via bundle-require) with direct `esbuild@^0.28.1` (secure) + two externalized ESM/CJS builds.
- Comprehensive `overrides` (25+) + nested for `npm/**`, `commitizen`, `@typescript-eslint/*`, `jest-config`, etc. for lodash, tar, glob, minimatch, tmp, rollup, esbuild, flatted, picomatch, yaml, brace-expansion, diff, etc.
- Clean `npm install` + `npm audit` iterations until only **1 high remains**: vendored `picomatch` inside the `npm` package's private `node_modules` (used exclusively by release/CI tooling and the local `npm` CLI). This does **not** ship in the published library tarball, does not affect runtime, and cannot be triggered by normal use of the package. Documented here for transparency.
- **Input sanitization + path validation** added to `wpAPIPrefix`, `version`, `endpoint`, and base `url` (constructor + `_setDefaultsOptions` + `_getUrl`). Rejects `..`, protocol confusion, absolute paths, illegal chars, and excessive slashes. Throws `OptionsException`.
- Resource limits, timeout enforcement, throttling, and retry-with-429-awareness (pre-existing from 7.1.2) retained and strengthened.
- No `tmp`, no `lodash` (or `_.template`/ `_.unset`), no `eval`, no `Function` constructor anywhere in src/.
- `sideEffects: false`, engines bumped to `>=18`, ESM/CJS dual with proper externals for tree-shaking.
- All production dependencies (`axios@1.18+`, `oauth-1.0a`, `url-parse`) audited clean in the context of this library.

Runtime attack surface is minimal by design (following patterns from official `wc-api-php` and `wc-api-python`).

## Verifying a Release

```bash
npm audit --audit-level=high
npm run build
npm test
```

The published package contains only `dist/` (no dev deps, no node_modules).

