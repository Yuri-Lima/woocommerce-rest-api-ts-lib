# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased / Next]

### Security

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

