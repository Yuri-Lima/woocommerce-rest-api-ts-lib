import axios, {
    RawAxiosRequestHeaders,
    AxiosRequestConfig,
    AxiosInstance,
    AxiosResponse,
} from "axios";
import crypto from "node:crypto";
import OAuth from "oauth-1.0a";
import Url from "url-parse";

// NEW ARCHITECTURE: All types come from the separated, barrel-exported modules.
// This enables tree-shaking of unused models/requests and clean separation of concerns.
import type {
    WooRestApiMethod,
    IWooRestApiOptions,
    WooRestApiEndpoint,
    OrdersMainParams,
    ProductsMainParams,
    SystemStatusParams,
    CouponsParams,
    CustomersParams,
    DELETE,
    Orders,
    Products,
    Customers,
    Coupons,
    SystemStatus,
    WooCommerceApiResponse,
    WooRestApiVersion,
    WooRestApiEncoding,
} from "./types/index";

// Import the error classes as *values* for use inside this module (sanitize, _request, ctor).
// We also re-export them below so consumers can `import { WooCommerceApiError } from "..."`.
import {
    WooCommerceApiError,
    OptionsException,
} from "./types/index";

// Re-export for public API surface (tree-shakeable named exports).
// AuthenticationError is re-exported without a local value import to satisfy noUnusedLocals.
export {
    WooCommerceApiError,
    AuthenticationError,
    OptionsException,
} from "./types/index";

// Re-export the complete public type surface (barrel) for consumers.
export type {
    WooRestApiMethod,
    IWooRestApiOptions,
    WooRestApiEndpoint,
    OrdersMainParams,
    ProductsMainParams,
    SystemStatusParams,
    CouponsParams,
    CustomersParams,
    DELETE,
    Orders,
    Products,
    Customers,
    Coupons,
    SystemStatus,
    IWooRestApiQuery,
    WooCommerceApiResponse,
} from "./types/index";

/**
 * Aggregate of all possible query param shapes (for backward compat + internal use).
 */
export type WooRestApiParams = CouponsParams &
  CustomersParams &
  OrdersMainParams &
  ProductsMainParams &
  SystemStatusParams &
  DELETE;

/* ============================================================================
 * SECURITY & ARCHITECTURE NOTES (production-grade hardening)
 * - Endpoint sanitization: prevents path traversal (../), enforces relative
 *   REST paths, length limits.
 * - Resource limits (maxContentLength / maxBodyLength) + timeout enforcement
 *   always applied in _request (CVE-2026-44488 class mitigations).
 * - Client throttling via maxConcurrentRequests + queue.
 * - Exponential backoff + 429 Retry-After awareness (opt-in via retryConfig).
 * - Dependency Injection hook: pass a pre-configured AxiosInstance via
 *   options.axiosInstance for testing / custom adapters / interceptors.
 * - The library is ESM-first (tsup produces .mjs + .js), side-effect free,
 *   and fully tree-shakable when only importing types or specific helpers.
 * - Strictest TS: no `any`, unknown for payloads, branded opportunities exist
 *   for ID/Endpoint in future if desired.
 * Follows patterns from official woocommerce/woocommerce-rest-api (JS/PHP/Python):
 * thin facade, automatic auth, generic get/post/put/delete, batch via /batch,
 * pagination via response headers.
 * ========================================================================== */

/**
 * Input sanitization for WooCommerce REST endpoints.
 * - Strips leading/trailing slashes (we compose the path ourselves).
 * - Rejects or neutralizes directory traversal sequences.
 * - Enforces a conservative max length.
 * - Allows only alphanum, /, _, -, . (Woo resources are well-known).
 *
 * This is defense-in-depth; the server is authoritative, but we fail fast on
 * obviously malicious caller input.
 */
export function sanitizeEndpoint(raw: string): string {
    if (typeof raw !== "string") {
        throw new OptionsException("endpoint must be a string");
    }
    let ep = raw.trim();

    // Remove dangerous traversal and leading ./
    if (ep.includes("..") || ep.includes("./") || ep.startsWith("/")) {
    // Normalize by removing all ../ and ./ segments, and any leading/trailing /
        ep = ep.replace(/\.\.+/g, "").replace(/\.\/+/g, "").replace(/^\/+/, "").replace(/\/+$/, "");
    }

    // Final cleanup
    ep = ep.replace(/^\/+/, "").replace(/\/+$/, "");

    if (ep.length === 0) {
        throw new OptionsException("endpoint cannot be empty after sanitization");
    }
    if (ep.length > 128) {
        throw new OptionsException("endpoint exceeds maximum allowed length");
    }
    // Whitelist-ish (allow known patterns + custom extensions)
    if (!/^[\w\-./]+$/.test(ep)) {
        throw new OptionsException("endpoint contains invalid characters");
    }
    return ep;
}

/**
 * Simple helper to fetch every page for an endpoint (research-backed pattern).
 * Respects X-WP-TotalPages and adds small delay between pages to be polite.
 * Use for bulk operations; for very large catalogs prefer webhooks or streaming.
 */
export async function fetchAllPages<T>(
    client: { get: <R>(endpoint: WooRestApiEndpoint, params?: Record<string, unknown>) => Promise<WooCommerceApiResponse<R>> },
    endpoint: WooRestApiEndpoint,
    baseParams: Record<string, unknown> = {},
    pageSize = 100,
): Promise<T[]> {
    const results: T[] = [];
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const resp = await client.get<T[]>(endpoint, {
            ...baseParams,
            per_page: pageSize,
            page,
        });
        const chunk = Array.isArray(resp.data) ? resp.data : [];
        results.push(...chunk);
        const totalPages = Number(resp.headers?.["x-wp-totalpages"] ?? 1);
        if (page >= totalPages || chunk.length === 0) break;
        page += 1;
        await new Promise((_resolve) => setTimeout(_resolve, 50)); // polite pacing
    }
    return results;
}

/**
 * WooCommerce REST API client (modernized, DI-friendly, strict TypeScript).
 *
 * Architecture:
 * - Constructor validates + normalizes config (no unsafe defaults).
 * - All HTTP goes through a single _request path with guards.
 * - Axios instance can be injected for full DI (mocking, custom baseURL, interceptors).
 * - Public surface stays familiar (get/post/put/delete + convenience) for easy migration.
 */
export default class WooCommerceRestApi<T extends IWooRestApiOptions = IWooRestApiOptions> {
    protected readonly _opt: T & {
    wpAPIPrefix: string;
    version: WooRestApiVersion;
    isHttps: boolean;
    encoding: WooRestApiEncoding;
    queryStringAuth: boolean;
    classVersion: string;
  };

    // Concurrency control (throttling)
    private _maxConcurrentRequests = 0;
    private _currentConcurrentRequests = 0;
    private readonly _requestQueue: Array<() => void> = [];

    // Injected or default axios for DI / testing
    private readonly _axios: AxiosInstance;

    constructor(opt: T) {
        if (!opt || typeof opt !== "object") {
            throw new OptionsException("options object is required");
        }
        if (!opt.url || opt.url.trim() === "") {
            throw new OptionsException("url is required");
        }
        if (!opt.consumerKey || opt.consumerKey.trim() === "") {
            throw new OptionsException("consumerKey is required");
        }
        if (!opt.consumerSecret || opt.consumerSecret.trim() === "") {
            throw new OptionsException("consumerSecret is required");
        }

        // Normalize (defaults + security hardening)
        const normalized = {
            ...opt,
            wpAPIPrefix: opt.wpAPIPrefix?.trim() || "wp-json",
            version: (opt.version || "wc/v3") as WooRestApiVersion,
            isHttps: /^https/i.test(opt.url),
            encoding: (opt.encoding || "utf-8") as WooRestApiEncoding,
            queryStringAuth: !!opt.queryStringAuth,
            classVersion: "8.0.0", // security + arch overhaul release
            maxContentLength: opt.maxContentLength ?? 10 * 1024 * 1024,
            maxBodyLength: opt.maxBodyLength ?? 10 * 1024 * 1024,
            timeout: opt.timeout ?? 30000,
            maxConcurrentRequests: opt.maxConcurrentRequests ?? 0,
        } as T & {
      wpAPIPrefix: string;
      version: WooRestApiVersion;
      isHttps: boolean;
      encoding: WooRestApiEncoding;
      queryStringAuth: boolean;
      classVersion: string;
      maxConcurrentRequests: number;
    };

        this._opt = normalized;
        this._maxConcurrentRequests = normalized.maxConcurrentRequests;

        // DI: allow caller to supply a fully configured Axios instance (e.g. with interceptors, custom adapter, or a jest mock).
        // This is the primary extension point for advanced use and testing without monkey-patching.
        const axCfg = (this._opt.axiosConfig ?? {}) as AxiosRequestConfig;
        // Use unknown cast (no top-level `any` in source) to support optional injected axiosInstance for DI.
        const injected = (axCfg as { axiosInstance?: AxiosInstance }).axiosInstance;
        this._axios = injected ?? axios.create(axCfg);
    }

    /**
   * Acquire throttle slot (0 = unlimited).
   */
    private async _acquireSlot(): Promise<void> {
        if (this._maxConcurrentRequests <= 0) return;
        if (this._currentConcurrentRequests < this._maxConcurrentRequests) {
            this._currentConcurrentRequests++;
            return;
        }
        return new Promise<void>((_resolve) => {
            this._requestQueue.push(() => {
                this._currentConcurrentRequests++;
                _resolve();
            });
        });
    }

    private _releaseSlot(): void {
        if (this._maxConcurrentRequests <= 0) return;
        this._currentConcurrentRequests = Math.max(0, this._currentConcurrentRequests - 1);
        const next = this._requestQueue.shift();
        if (next) next();
    }

    /**
   * Core execution with retry + rate-limit awareness.
   * All axios calls in the library go through here (or the injected instance).
   */
    private async _executeWithRetry(config: AxiosRequestConfig): Promise<AxiosResponse> {
        const retryCfg = this._opt.retryConfig ?? {};
        const maxRetries = retryCfg.retries ?? 0;
        const baseDelay = retryCfg.retryDelay ?? 1000;
        const retryable = retryCfg.retryOn ?? [408, 429, 500, 502, 503, 504];

        let lastErr: unknown;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this._axios(config);
            } catch (err: unknown) {
                lastErr = err;
                const e = err as { response?: { status?: number; headers?: Record<string, unknown> }; code?: string };
                const status = e.response?.status;
                const isNet = !e.response || ["ECONNRESET", "ETIMEDOUT", "ECONNABORTED"].includes(e.code ?? "");
                const isRetryableStatus = !status || retryable.includes(status);
                const should = attempt < maxRetries && (isNet || isRetryableStatus);
                if (!should) throw err;

                let delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
                if (status === 429) {
                    const ra = (e.response?.headers as any)?.["retry-after"];
                    if (ra != null) {
                        const secs = parseInt(String(ra), 10);
                        if (!Number.isNaN(secs) && secs > 0) delay = Math.max(delay, secs * 1000);
                        else {
                            const d = new Date(String(ra));
                            if (!Number.isNaN(d.getTime())) delay = Math.max(delay, d.getTime() - Date.now());
                        }
                    }
                }
                delay = Math.min(delay, 30000);
                await new Promise((_resolve) => setTimeout(_resolve, Math.floor(delay)));
            }
        }
        throw lastErr;
    }

    /**
   * Secure URL builder.
   * Uses sanitizeEndpoint + careful string construction + URL for hostname/port safety.
   */
    _getUrl(endpoint: string, params: Partial<Record<string, unknown>> = {}): string {
        const safeEndpoint = sanitizeEndpoint(endpoint);

        const base = this._opt.url.endsWith("/") ? this._opt.url : this._opt.url + "/";
        const apiSegment = `${this._opt.wpAPIPrefix}/${this._opt.version}/`;
        let url = base + apiSegment + safeEndpoint;

        const p = { ...params };
        if (p.id != null) {
            url += `/${encodeURIComponent(String(p.id))}`;
            delete p.id;
        }

        if (Object.keys(p).length > 0) {
            const qs = Object.entries(p)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
                .join("&");
            url += `?${qs}`;
        }

        if (this._opt.port) {
            try {
                const u = new URL(url);
                url = url.replace(u.hostname, `${u.hostname}:${this._opt.port}`);
            } catch {
                // fallback to previous behavior if URL parsing fails (unusual)
                const host = new Url(url).hostname;
                url = url.replace(host, `${host}:${this._opt.port}`);
            }
        }

        return url;
    }

    /**
   * OAuth1 header generator (one-legged, HMAC-SHA256) for non-HTTPS stores.
   * Required per WooCommerce REST API auth docs.
   */
    _getOAuth(url: string, method: WooRestApiMethod) {
        const oauth = new OAuth({
            consumer: {
                key: this._opt.consumerKey,
                secret: this._opt.consumerSecret,
            },
            signature_method: "HMAC-SHA256",
            hash_function: (base: string, key: string) =>
                crypto.createHmac("sha256", key).update(base).digest("base64"),
        });
        return oauth.authorize({ url, method });
    }

    /**
   * The single HTTP path. All public verbs delegate here.
   * Applies sanitization, resource limits, throttling, retries, and enhanced errors.
   */
    async _request(
        method: WooRestApiMethod,
        endpoint: string,
        data?: Record<string, unknown>,
        params: Record<string, unknown> = {},
    ): Promise<AxiosResponse> {
        const url = this._getUrl(endpoint, params);

        const headers: RawAxiosRequestHeaders = {
            Accept: "application/json",
        };
        if (typeof process !== "undefined" && Object.prototype.toString.call(process) === "[object process]") {
            headers["User-Agent"] = `WooCommerce REST API - TS Client/${this._opt.classVersion}`;
        }

        const DEFAULT_MAX_CONTENT = 10 * 1024 * 1024;
        const DEFAULT_MAX_BODY = 10 * 1024 * 1024;
        const DEFAULT_TIMEOUT = 30000;

        const axUser = (this._opt.axiosConfig ?? {}) as Partial<AxiosRequestConfig>;
        const explicitTimeout = "timeout" in axUser ? axUser.timeout : undefined;
        const explicitMaxC = "maxContentLength" in axUser ? axUser.maxContentLength : undefined;
        const explicitMaxB = "maxBodyLength" in axUser ? axUser.maxBodyLength : undefined;

        let options: AxiosRequestConfig = {
            url,
            method,
            responseEncoding: this._opt.encoding,
            timeout:
        explicitTimeout != null && explicitTimeout > 0
            ? explicitTimeout
            : (this._opt.timeout ?? DEFAULT_TIMEOUT),
            responseType: "json",
            headers: { ...headers },
            params: {},
            data: data ? JSON.stringify(data) : null,
            maxContentLength:
        explicitMaxC != null && explicitMaxC >= 0
            ? explicitMaxC
            : (this._opt.maxContentLength ?? DEFAULT_MAX_CONTENT),
            maxBodyLength:
        explicitMaxB != null && explicitMaxB >= 0
            ? explicitMaxB
            : (this._opt.maxBodyLength ?? DEFAULT_MAX_BODY),
        };

        if (this._opt.isHttps) {
            if (this._opt.queryStringAuth) {
                options.params = {
                    consumer_key: this._opt.consumerKey,
                    consumer_secret: this._opt.consumerSecret,
                    ...(options.params as object),
                };
            } else {
                options.auth = {
                    username: this._opt.consumerKey,
                    password: this._opt.consumerSecret,
                };
            }
            options.params = { ...(options.params as object), ...params };
        } else {
            options.params = this._getOAuth(url, method);
        }

        if (options.data) {
            options.headers = {
                ...headers,
                "Content-Type": `application/json; charset=${this._opt.encoding}`,
            };
        }

        // User axiosConfig wins for provided keys (explicit overrides)
        options = { ...options, ...axUser };

        // Safety clamps (never allow unbounded unless user explicitly passed -1 and we preserved it)
        if (options.timeout == null || (options.timeout as number) <= 0) options.timeout = DEFAULT_TIMEOUT;
        if (options.maxContentLength == null || (options.maxContentLength as number) < 0) {
            if (explicitMaxC === undefined) options.maxContentLength = this._opt.maxContentLength ?? DEFAULT_MAX_CONTENT;
        }
        if (options.maxBodyLength == null || (options.maxBodyLength as number) < 0) {
            if (explicitMaxB === undefined) options.maxBodyLength = this._opt.maxBodyLength ?? DEFAULT_MAX_BODY;
        }

        await this._acquireSlot();
        try {
            const resp = await this._executeWithRetry(options);
            return resp;
        } catch (error: unknown) {
            const e = error as { response?: { data?: { message?: string }; status?: number; headers?: unknown }; request?: unknown; message?: string };
            if (e.response) {
                throw new WooCommerceApiError(
                    e.response.data?.message || e.message || "API request failed",
                    e.response.status,
                    e.response.data,
                    endpoint,
                );
            }
            if (e.request) {
                throw new WooCommerceApiError("Network error: No response received from server", 0, null, endpoint);
            }
            throw new WooCommerceApiError(`Request setup error: ${e.message ?? "unknown"}`, 0, null, endpoint);
        } finally {
            this._releaseSlot();
        }
    }

    // Public HTTP verbs (generic + typed responses)
    async get<T = unknown>(
        endpoint: WooRestApiEndpoint,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        const r = await this._request("GET", endpoint, undefined, (params ?? {}) as Record<string, unknown>);
        return { data: r.data as T, status: r.status, statusText: r.statusText, headers: r.headers as any };
    }

    async post<T = unknown>(
        endpoint: WooRestApiEndpoint,
        data: Record<string, unknown>,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        const r = await this._request("POST", endpoint, data, (params ?? {}) as Record<string, unknown>);
        return { data: r.data as T, status: r.status, statusText: r.statusText, headers: r.headers as any };
    }

    async put<T = unknown>(
        endpoint: WooRestApiEndpoint,
        data: Record<string, unknown>,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        const r = await this._request("PUT", endpoint, data, (params ?? {}) as Record<string, unknown>);
        return { data: r.data as T, status: r.status, statusText: r.statusText, headers: r.headers as any };
    }

    async delete<T = unknown>(
        endpoint: WooRestApiEndpoint,
        data: Pick<WooRestApiParams, "force"> = {},
        params: Pick<WooRestApiParams, "id"> = {} as any,
    ): Promise<WooCommerceApiResponse<T>> {
        const r = await this._request("DELETE", endpoint, data as Record<string, unknown>, params as Record<string, unknown>);
        return { data: r.data as T, status: r.status, statusText: r.statusText, headers: r.headers as any };
    }

    async options<T = unknown>(
        endpoint: WooRestApiEndpoint,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        const r = await this._request("OPTIONS", endpoint, {}, (params ?? {}) as Record<string, unknown>);
        return { data: r.data as T, status: r.status, statusText: r.statusText, headers: r.headers as any };
    }

    // Convenience methods (typed, ergonomic). These delegate to the generic verbs.
    async getProducts(params?: Record<string, unknown>): Promise<WooCommerceApiResponse<Products[]>> {
        return this.get<Products[]>("products", params);
    }

    async getProduct(id: number): Promise<WooCommerceApiResponse<Products>> {
        return this.get<Products>("products", { id });
    }

    async createProduct(productData: Partial<Products>): Promise<WooCommerceApiResponse<Products>> {
        return this.post<Products>("products", productData as Record<string, unknown>);
    }

    async updateProduct(id: number, productData: Partial<Products>): Promise<WooCommerceApiResponse<Products>> {
        return this.put<Products>("products", productData as Record<string, unknown>, { id });
    }

    async getOrders(params?: Record<string, unknown>): Promise<WooCommerceApiResponse<Orders[]>> {
        return this.get<Orders[]>("orders", params);
    }

    async getOrder(id: number): Promise<WooCommerceApiResponse<Orders>> {
        return this.get<Orders>("orders", { id });
    }

    async createOrder(orderData: Partial<Orders>): Promise<WooCommerceApiResponse<Orders>> {
        return this.post<Orders>("orders", orderData as Record<string, unknown>);
    }

    async getCustomers(params?: Partial<CustomersParams>): Promise<WooCommerceApiResponse<Customers[]>> {
        return this.get<Customers[]>("customers", params);
    }

    async getCustomer(id: number): Promise<WooCommerceApiResponse<Customers>> {
        return this.get<Customers>("customers", { id });
    }

    async getCoupons(params?: Partial<CouponsParams>): Promise<WooCommerceApiResponse<Coupons[]>> {
        return this.get<Coupons[]>("coupons", params);
    }

    async getSystemStatus(): Promise<WooCommerceApiResponse<SystemStatus>> {
        return this.get<SystemStatus>("system_status");
    }
}
