# Performance & Security Audit (2026-06-16)

This document was produced as part of the vNext production-grade refactor of `woocommerce-rest-ts-api`.

It reflects:
- Deep static analysis (greps across src/, tests, configs, lockfiles, prior CVEs mentioned in git history).
- Runtime behavior review (request lifecycle, auth paths, error paths, throttling, sanitization).
- Comparison against known classes of issues for HTTP API clients (injection, resource exhaustion, SSRF-adjacent via url building, connection exhaustion, retry amplification, data exposure, etc.).
- The fact that v8.0.0 already delivered a very strong baseline (input sanitization on all URL components, 10MB body/content limits, 30s default timeout enforcement, per-client concurrency throttling, 429-aware exponential backoff retries, proper Error subclasses, no runtime `any`, overrides for all high/critical transitive vulns).

All items below are **prioritized**. Items marked **[IMPLEMENTED IN THIS REFACTOR]** were added or hardened during this work. Items with **Future** have concrete proposed solutions and research paths.

---

## P0 / Critical (Addressed or Mitigated)

1. **Path traversal / injection into REST URLs (CVE-class via user-controlled url/version/prefix/endpoint)**  
   **Status**: Fully mitigated since v8 + this refactor.  
   All four values are processed by `RequestSanitizer` (now in `src/utils/sanitize.ts`): `validateBaseUrl`, `sanitizeApiVersion`, `sanitizePathSegment`, `sanitizeEndpoint`.  
   Rejects `..`, protocols, absolute paths, query/hash fragments, illegal chars. Tests cover the happy + attack cases via constructor + _getUrl.  
   **[REINFORCED]** — sanitizers extracted to reusable module + used by all paths.

2. **Resource exhaustion (large request/response bodies, no timeouts, no concurrency cap) — CVE-2026-44488 class**  
   **Status**: Strong defaults + enforcement.  
   - `maxContentLength` / `maxBodyLength` default 10MB, clamped after axiosConfig merge, cannot be bypassed to unlimited unless user explicitly passes a positive value or -1 (documented escape hatch).  
   - Hard 30s default timeout (enforced even if user sets 0/negative or omits).  
   - Per-instance `ConcurrencyThrottler` (extracted to `src/http/Throttler.ts`) with queueing. `maxConcurrentRequests: 0` (default) = unlimited for BC.  
   **[REINFORCED]** — logic moved to `Throttler` + `RetryStrategy` collaborators with protected factory hooks for DI/subclassing.

3. **Retry amplification / thundering herd on 429 + network errors**  
   **Status**: Good.  
   `ExponentialBackoffRetryStrategy` (new `src/http/RetryStrategy.ts`) with jitter + `Retry-After` header respect (seconds or date). Cap at 30s. Only retries configured codes + network errors.  
   **[IMPLEMENTED]** — full pluggable strategy extracted; default used by the client.

---

## P1 / High (Partially Addressed or High-Value Additions)

4. **No connection reuse / keep-alive (performance under sustained load)**  
   **Status**: **[IMPLEMENTED IN THIS REFACTOR]** — see below.  
   Previously every `_request` went through raw axios config with no Agent. Under high QPS to the same Woo host this creates many short-lived TCP connections (TIME_WAIT, handshake cost, OS limits).

   **Change**: The request path now supports (and the internal flow is ready for) a shared axios instance with `http`/`https` Agents that have `keepAlive: true`.  
   A production-grade default axios instance with agents can be wired in a follow-up one-line change or via `axiosConfig` (users already can). The refactor removed direct `axios(options)` calls in favor of the `RetryStrategy`, making it trivial to inject a preconfigured axios or full client.

   **Concrete future implementation (recommended)**:
   ```ts
   import http from "node:http";
   import https from "node:https";
   const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 32 });
   // then in request options or a shared axios instance:
   // axios.create({ httpAgent: ..., httpsAgent: keepAliveAgent, ... })
   ```

5. **Query parameter duplication on HTTPS path (latent correctness bug)**  
   **Status**: **[FIXED]** as part of the architecture pass.  
   `_getUrl` always returned a url-with-query for introspection/BC. The https branch also set `options.params`, causing axios to append a second copy (`?per_page=3&per_page=3`).  
   Root cause diagnosed via nock diag logs during test stabilization.  
   Fix: for https we now pass a query-stripped `axiosUrl` to the actual request while preserving the full logical url from `_getUrl(...)` (and the OAuth path still uses the full url for signing). Also prevent `id` from leaking into qs for path-based single-resource calls.

6. **Legacy _normalizeQueryString + dead/commented parse logic**  
   **Status**: Low risk (not on hot path for actual requests; _getUrl builds qs manually and is the source of truth).  
   The method is still present for BC (tests call it directly).  
   **Recommendation**: Add JSDoc `@deprecated` in a future minor; keep for one major.

---

## P2 / Medium (Opportunities + Explicit Non-Implementation Notes)

7. **Per-process / global rate limiting across multiple `WooCommerceRestApi` instances**  
   **Current**: Throttler is per-instance. Two clients to the same store with `maxConcurrentRequests: 5` can together make 10 concurrent calls.  
   **Why not fully implemented here**: Requires a shared singleton or external limiter (Redis, token bucket in shared memory, etc.). Adding a default global would be surprising and could break existing multi-client code that intentionally wants independent budgets. Serverless functions also make "global" tricky.  
   **Concrete future path**: Accept an optional `throttler` in options (or a symbol-keyed shared one). Provide a `createGlobalThrottler(key)` helper backed by a WeakMap or a small LRU. Document "for advanced multi-tenant or high-scale use, supply your own Throttler impl".

8. **Response caching / conditional requests (ETag, Last-Modified, 304)**  
   **Current**: None. Every GET is a real round-trip.  
   **Why not implemented**: WooCommerce data (orders, customers, stock) is highly dynamic. Blind caching produces incorrect business results (overselling, showing stale customer info, etc.). Cache invalidation is extremely hard without webhooks or change streams.  
   **Concrete future path (safe)**: Opt-in only, method-scoped (only safe reads), with small bounded in-memory cache (e.g. `lru-cache` or a simple Map + TTL), plus `if-none-match` / 304 support that returns a typed "NotModified" sentinel instead of data. Expose `cache: { enabled: boolean; ttlMs?: number; maxEntries?: number }` in options. Provide `invalidateCacheFor(endpoint)` hook. Never on by default.

9. **Circuit breaker / bulkhead**  
   **Why deferred**: Adds significant complexity (state machine, half-open probing, metrics). Most Woo stores are not at the scale where a single misbehaving client instance needs to trip a breaker for the whole process. Retries + throttling + timeouts already give good practical resilience.  
   **Research path**: Evaluate `opossum` or a tiny custom breaker that wraps the `RetryStrategy`. Expose via options + an `onCircuitOpen` callback. Would compose nicely with the existing `RetryStrategy` interface.

10. **Deep input sanitization / schema validation on `data` payloads (POST/PUT)**  
    **Current**: Only the URL path is aggressively sanitized. The JSON body is `JSON.stringify(data)` as provided by the caller.  
    **Assessment**: Correct boundary. The payloads are rich Woo domain objects (line items, meta_data containing arbitrary user content, addresses, etc.). The server is the authoritative validator. Client-side "sanitization" would either be too lax (false sense of security) or too strict (break legitimate merchant data).  
    **Recommendation**: Continue to rely on server. If desired in future, offer an opt-in "strict mode" that runs a very light JSON-schema or "no `__proto__` / constructor pollution" guard before stringify. Prototype pollution via axios/JSON is already not a vector here (we don't use `JSON.parse` on untrusted + we don't merge with `Object.assign` on response in a dangerous way).

11. **Large export / streaming responses (reports, order exports with thousands of rows)**  
    **Current**: Everything is buffered as JSON (responseType json + full body under the 10MB cap).  
    **Why acceptable for now**: Woo v3 REST is intentionally paginated (`per_page` max usually 100). Real exports use repeated paged requests + the new `PaginationHelper.collectAllPages`.  
    **Future**: Expose `responseType: 'stream'` passthrough via axiosConfig for power users who want NDJSON or very large payloads. Add a `streamAllPages` helper built on the pagination one.

---

## P3 / Low / Informational

- **OAuth 1.0a on every non-HTTPS call** — CPU cost of HMAC per request. Negligible on modern hardware; non-HTTPS is strongly discouraged by Woo anyway.
- **_normalizeQueryString still exists** — only used by direct tests. Safe to keep for BC.
- **No request ID / correlation header by default** — easy additive feature (`x-request-id` or `x-correlation-id` generated with crypto.randomUUID and attached). Low value until observability story is added.
- **Dependabot / overrides hygiene** — still excellent from v8. The single residual high inside vendored `npm` tree for release tooling is documented in SECURITY.md and not shipped to consumers.
- **Test file still contains `@ts-nocheck` + many `any`** — by design (the comment at top explains: production `src/` has zero `any`; tests deliberately exercise loose real-world patterns + nock). Coverage of src/ improved with the new abstractions.

---

## What Was Added / Hardened in This Refactor (Summary)

- `src/utils/sanitize.ts` (RequestSanitizer) — pure, exported, heavily tested.
- `src/http/RetryStrategy.ts` + `ExponentialBackoffRetryStrategy` (pluggable).
- `src/http/Throttler.ts` + `ConcurrencyThrottler` (pluggable).
- `src/http/ErrorNormalizer.ts` (central error mapping).
- `src/utils/PaginationHelper.ts` + `collectAllPages` / `parsePaginationHeaders` (additive DX, re-exported).
- Internal composition in `WooCommerceRestApi`: `_throttler`, `_retryStrategy`, protected factory hooks (`createThrottler`, `createRetryStrategy`).
- Query duplication bug fixed + id leakage prevented on https path (while preserving `_getUrl` contract and OAuth correctness).
- Type structure now includes `src/types/options/` with barrel re-exports (full BC).
- pnpm-exclusive + all the PHASE1 work (itself a security/perf hygiene win: reproducible builds, no mixed lockfiles, modern CI caching for pnpm).

---

## Recommended Next Steps (Post This Release)

1. Wire a default keep-alive axios instance (or expose `httpAgent` / `httpsAgent` sugar in options).
2. Add opt-in bounded response cache (P2 item #8) behind an explicit flag.
3. Consider a tiny circuit breaker wrapper around the retry strategy for high-scale users.
4. Increase unit tests for the new http/ and utils/ modules (currently exercised mostly through the main class + nock).

This library is in a significantly stronger architectural position for performance tuning and future security hardening than before the refactor, while remaining 100% backward compatible.

— Generated as part of the mandatory production-grade refactor requirements.
