import type { RawAxiosRequestHeaders, AxiosRequestConfig } from "axios";
import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";
import OAuth from "oauth-1.0a";
import Url from "url-parse";

// All types now come from the new modular structure (core/requests/responses/errors/models + barrels)
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
} from "./types/index.js";
import {
    OptionsException,
} from "./types/index.js";

// Reusable abstractions (RequestSanitizer, RetryStrategy, Throttler, ErrorNormalizer)
import {
    sanitizePathSegment,
    sanitizeEndpoint,
    sanitizeApiVersion,
    validateBaseUrl,
} from "./utils/sanitize.js";
import { createDefaultRetryStrategy, type RetryStrategy } from "./http/RetryStrategy.js";
import { createThrottler, type Throttler } from "./http/Throttler.js";
import { normalizeAxiosError } from "./http/ErrorNormalizer.js";

// Default keep-alive agents for connection reuse (high-impact perf improvement under load).
// Users can still fully override via axiosConfig.httpAgent / httpsAgent.
const DEFAULT_HTTP_AGENT = new http.Agent({ keepAlive: true, maxSockets: 32 });
const DEFAULT_HTTPS_AGENT = new https.Agent({ keepAlive: true, maxSockets: 32 });

// Re-export the full public surface (types + error classes) for consumers + backward compat
export type {
    WooRestApiMethod,
    IWooRestApiQuery,
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
} from "./types/index.js";
export { WooCommerceApiError, AuthenticationError, OptionsException } from "./types/index.js";

/**
 * Set the axiosConfig property to the axios config object.
 */
export type WooRestApiOptions = IWooRestApiOptions<AxiosRequestConfig>;

/**
 * Set all the possible query params for the WooCommerce REST API.
 */
export type WooRestApiParams = CouponsParams &
  CustomersParams &
  OrdersMainParams &
  ProductsMainParams &
  SystemStatusParams &
  DELETE;

// Sanitizers are now provided by the reusable RequestSanitizer module (src/utils/sanitize.ts).
// The functions are pure and throw OptionsException for bad input (path traversal etc).

/**
 * WooCommerce REST API wrapper
 *
 * @param {Object} opt
 */
export default class WooCommerceRestApi<T extends WooRestApiOptions> {
    protected _opt: T;

    // Composed collaborators (internal DI for modularity + extensibility).
    // These are created from options at construction time. Advanced users can subclass and override
    // protected factory methods if they want to inject custom strategies (while keeping full public BC).
    protected _throttler: Throttler;
    protected _retryStrategy: RetryStrategy;

    /**
   * Class constructor.
   *
   * @param {Object} opt
   */
    constructor(opt: T) {
        this._opt = opt;

        /**
     * If the class is not instantiated, return a new instance.
     * This is useful for the static methods.
     */
        if (!(this instanceof WooCommerceRestApi)) {
            return new WooCommerceRestApi(opt);
        }

        /**
     * Check if the url is defined.
     */
        if (!this._opt.url || this._opt.url === "") {
            throw new OptionsException("url is required");
        }
        // SECURITY: validate early (throws OptionsException on bad input)
        validateBaseUrl(this._opt.url);

        /**
     * Check if the consumerKey is defined.
     */
        if (!this._opt.consumerKey || this._opt.consumerKey === "") {
            throw new OptionsException("consumerKey is required");
        }

        /**
     * Check if the consumerSecret is defined.
     */
        if (!this._opt.consumerSecret || this._opt.consumerSecret === "") {
            throw new OptionsException("consumerSecret is required");
        }

        /**
     * Set default options (also runs sanitization)
     */
        this._setDefaultsOptions(this._opt);

        // Create composed strategies (DI)
        this._throttler = createThrottler(this._opt.maxConcurrentRequests);
        this._retryStrategy = createDefaultRetryStrategy(this._opt.retryConfig);
    }

    /**
   * Set default options
   *
   * @param {Object} opt
   */
    _setDefaultsOptions(opt: T): void {
        // SECURITY: sanitize critical path segments to block traversal / injection into final REST URL
        const rawPrefix = opt.wpAPIPrefix || "wp-json";
        const rawVersion = opt.version || "wc/v3";

        this._opt.wpAPIPrefix = sanitizePathSegment(rawPrefix, "wpAPIPrefix");
        // version legitimately contains one "/" (wc/v3); use tolerant sanitizer
        this._opt.version = sanitizeApiVersion(rawVersion);

        this._opt.isHttps = /^https/i.test(this._opt.url);
        this._opt.encoding = opt.encoding || "utf-8";
        this._opt.queryStringAuth = opt.queryStringAuth || false;
        // Keep in sync with package.json version (woocommerce-rest-ts-api).
        this._opt.classVersion = opt.classVersion || "8.0.0";
    }

    /**
   * Protected factory hooks for subclass DI / custom strategies (advanced extensibility).
   * Default implementations are created in ctor from options.
   */
    protected createThrottler(max?: number): Throttler {
        return createThrottler(max);
    }

    protected createRetryStrategy(cfg?: IWooRestApiOptions["retryConfig"]): RetryStrategy {
        return createDefaultRetryStrategy(cfg);
    }

    // Backward-compat thin delegations (tests and power users call these _ methods directly)
    private async _acquireSlot(): Promise<void> {
        return this._throttler.acquire();
    }

    private _releaseSlot(): void {
        this._throttler.release();
    }

    /**
   * Core axios execution delegated to the (pluggable) RetryStrategy.
   * The strategy encapsulates exp backoff + 429 awareness.
   */
    private async _executeWithRetry(options: AxiosRequestConfig): Promise<import("axios").AxiosResponse> {
        return this._retryStrategy.executeWithRetry(options);
    }

    /**
   * Normalize query string for oAuth 1.0a.
   * Nested param flattening lives in callers / URL builders; the legacy
   * commented-out `_parseParamsObject` was dead code and has been removed.
   *
   * @param  {String} url
   * @param  {Object} params
   *
   * @return {String}
   */
    _normalizeQueryString(
        url: string,
        params: Partial<Record<string, any>>,
    ): string {
    /**
     * Exit if url and params are not defined
     */
        if (url.indexOf("?") === -1 && Object.keys(params).length === 0) {
            return url;
        }
        const query = new Url(url, true).query; // Parse the query string returned by the url

        const values = [];

        let queryString = "";

        /**
     * Loop through the params object and push the key and value into the values array
     * Example: values = ['key1=value1', 'key2=value2']
     */
        for (const key in query) {
            values.push(key);
        }

        values.sort(); // Sort the values array

        for (const i in values) {
            /*
       * If the queryString is not empty, add an ampersand to the end of the string
       */
            if (queryString.length) queryString += "&";

            /**
       * Add the key and value to the queryString
       */
            queryString +=
        encodeURIComponent(values[i]) +
        "=" +
        encodeURIComponent(<string | number | boolean>query[values[i]]);
        }
        /**
     * Replace %5B with [ and %5D with ]
     */
        queryString = queryString.replace(/%5B/g, "[").replace(/%5D/g, "]");

        /**
     * Return the url with the queryString
     */
        const urlObject = url.split("?")[0] + "?" + queryString;

        return urlObject;
    }

    /**
   * Get URL
   *
   * SECURITY: Always sanitizes the endpoint. Uses URL where practical + guards.
   */
    _getUrl(endpoint: string, params: Partial<Record<string, unknown>>): string {
        const safeEndpoint = sanitizeEndpoint(endpoint);

        const base = this._opt.url.endsWith("/") ? this._opt.url : this._opt.url + "/";
        // Build safely
        let url = `${base}${this._opt.wpAPIPrefix}/${this._opt.version}/${safeEndpoint}`;

        // id handling (mutates copy of params for query)
        const q = { ...params };
        if (q.id != null) {
            url = `${url}/${encodeURIComponent(String(q.id))}`;
            delete q.id;
        }

        // Query string via safe encoding (no object prototype issues)
        const queryKeys = Object.keys(q);
        if (queryKeys.length > 0) {
            const qs = queryKeys
                .sort() // stable for OAuth if ever used
                .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(q[k]))}`)
                .join("&");
            url = `${url}?${qs}`;
        }

        // Port injection (rare)
        if (this._opt.port) {
            try {
                const u = new URL(url);
                u.port = String(this._opt.port);
                url = u.toString();
            } catch {
                // fall back to previous behavior using url-parse for weird cases
                const hostname = new Url(url).hostname;
                url = url.replace(hostname, `${hostname}:${this._opt.port}`);
            }
        }

        return url;
    }

    /**
   * Create Hmac was deprecated fot this version at 16.11.2022
   * Get OAuth 1.0a since it is mandatory for WooCommerce REST API
   * You must use OAuth 1.0a "one-legged" authentication to ensure REST API credentials cannot be intercepted by an attacker.
   * Reference: https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication-over-http
   * @return {Object}
   */
    _getOAuth(): OAuth {
        const data = {
            consumer: {
                key: this._opt.consumerKey,
                secret: this._opt.consumerSecret,
            },
            signature_method: "HMAC-SHA256",
            hash_function: (base: string, key: string) => {
                return crypto.createHmac("sha256", key).update(base).digest("base64");
            },
        };

        return new OAuth(data);
    }

    /**
   * Axios request
   * Mount the options to send to axios and send the request.
   *
   * Implements:
   * - Resource limits (maxContentLength / maxBodyLength) to fully mitigate CVE-2026-44488
   * - Default timeout enforcement (30s) for safety
   * - Client-side request throttling via maxConcurrentRequests
   * - Exponential backoff retries with rate-limit (429 / Retry-After) awareness
   *
   * All via _request core + axiosConfig support. Backward compatible.
   *
   * @param  {String} method
   * @param  {String} endpoint
   * @param  {Object} data
   * @param  {Object} params
   *
   * @return {Object}
   */
    async _request(
        method: WooRestApiMethod,
        endpoint: string,
        data?: Record<string, unknown>,
        params: Record<string, unknown> = {},
    ): Promise<import("axios").AxiosResponse> {
        const url = this._getUrl(endpoint, params);

        const header: RawAxiosRequestHeaders = {
            Accept: "application/json",
        };
        if (
            typeof process !== "undefined" &&
            Object.prototype.toString.call(process) === "[object process]"
        ) {
            header["User-Agent"] =
                "WooCommerce REST API - TS Client/" + this._opt.classVersion;
        }

        const DEFAULT_MAX_CONTENT_LENGTH = 10 * 1024 * 1024;
        const DEFAULT_MAX_BODY_LENGTH = 10 * 1024 * 1024;
        const DEFAULT_TIMEOUT = 30000;

        const axCfg: Record<string, unknown> = (this._opt.axiosConfig as Record<string, unknown>) ?? {};
        const explicitMaxContent = "maxContentLength" in axCfg ? (axCfg.maxContentLength as number | undefined) : undefined;
        const explicitMaxBody = "maxBodyLength" in axCfg ? (axCfg.maxBodyLength as number | undefined) : undefined;
        const explicitTimeout = "timeout" in axCfg ? (axCfg.timeout as number | undefined) : undefined;

        // For https we intentionally strip the query string that _getUrl may have appended.
        // We rely on `options.params` (set below) so axios serializes the qs exactly once.
        // This fixes the latent duplication bug (?foo=1&foo=1) that occurred because _getUrl always
        // injected user query and then https path also set options.params.
        // Non-https (OAuth) keeps the full url because the signature must cover the exact query string.
        const axiosUrl = this._opt.isHttps ? url.split("?")[0] : url;

        let options: AxiosRequestConfig = {
            url: axiosUrl,
            method,
            responseEncoding: this._opt.encoding,
            timeout: explicitTimeout !== undefined ? explicitTimeout : (this._opt.timeout ?? DEFAULT_TIMEOUT),
            responseType: "json",
            headers: { ...header },
            params: {},
            data: data ? JSON.stringify(data) : null,
            // Pre-set limits; may be overridden by explicit axiosConfig below
            maxContentLength: explicitMaxContent !== undefined ? explicitMaxContent : (this._opt.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH),
            maxBodyLength: explicitMaxBody !== undefined ? explicitMaxBody : (this._opt.maxBodyLength ?? DEFAULT_MAX_BODY_LENGTH),
        };

        /**
     * If isHttps is false, add the query string to the params object
     */
        if (this._opt.isHttps) {
            if (this._opt.queryStringAuth) {
                options.params = {
                    consumer_key: this._opt.consumerKey,
                    consumer_secret: this._opt.consumerSecret,
                };
            } else {
                options.auth = {
                    username: this._opt.consumerKey,
                    password: this._opt.consumerSecret,
                };
            }

            // Do not leak "id" into query string for https path-style resources (id is already in path via _getUrl).
            // Prevents spurious ?id=123 on single-resource calls in addition to the path segment.
            const queryParams = { ...params };
            if (queryParams.id != null) {
                delete queryParams.id;
            }
            options.params = { ...options.params, ...queryParams };
        } else {
            options.params = this._getOAuth().authorize({
                url, // full url (with qs) for correct OAuth signature
                method,
            });
        }

        if (options.data) {
            options.headers = {
                ...header,
                "Content-Type": `application/json; charset=${this._opt.encoding}`,
            };
        }

        // Allow set and override Axios options (user axiosConfig wins for any keys provided).
        options = { ...options, ...this._opt.axiosConfig };

        // Apply keep-alive agents if the user did not explicitly provide httpAgent/httpsAgent.
        // This is a high-impact performance improvement for sustained traffic to the same host
        // (connection reuse, reduced handshake/TIME_WAIT overhead). 100% backward compatible:
        // any explicit agent in axiosConfig takes precedence (including setting to null/undefined to disable).
        if (!("httpAgent" in options) && !("httpsAgent" in options) && !("agent" in options)) {
            const isHttpsRequest = /^https:/i.test(String(options.url || ""));
            if (isHttpsRequest) {
                (options as any).httpsAgent = (options as any).httpsAgent ?? DEFAULT_HTTPS_AGENT;
            } else {
                (options as any).httpAgent = (options as any).httpAgent ?? DEFAULT_HTTP_AGENT;
            }
        }

        // Final safety: if after merge no positive finite timeout is set, enforce default.
        // This provides "timeout enforcement". 0 or negative is treated as "use default".
        if (options.timeout == null || options.timeout <= 0) {
            options.timeout = DEFAULT_TIMEOUT;
        }

        // Final safety clamp on size limits if user did not explicitly set them (incl. via axiosConfig)
        // and they ended up missing/unbounded after merge. Prevents accidental bypass of mitigation.
        if (options.maxContentLength == null || options.maxContentLength < 0) {
            // Only force default when truly unbounded (null/undefined or explicitly -1 was not passed through)
            // If user passed -1 explicitly it will have been set above and survive merge.
            if (explicitMaxContent === undefined) {
                options.maxContentLength = this._opt.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
            }
        }
        if (options.maxBodyLength == null || options.maxBodyLength < 0) {
            if (explicitMaxBody === undefined) {
                options.maxBodyLength = this._opt.maxBodyLength ?? DEFAULT_MAX_BODY_LENGTH;
            }
        }

        // Throttling + retry-protected execution.
        await this._acquireSlot();
        try {
            return await this._executeWithRetry(options);
        } catch (error: unknown) {
            throw normalizeAxiosError(error, { endpoint });
        } finally {
            this._releaseSlot();
        }
    }

    /**
   * GET requests
   *
   * @param  {String} endpoint
   * @param  {Object} params
   *
   * @return {Object}
   */
    get<T = unknown>(
        endpoint: WooRestApiEndpoint,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        return this._request("GET", endpoint, undefined, params).then(
            (response) => ({
                data: response.data as T,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers as WooCommerceApiResponse<T>["headers"],
            }),
        );
    }

    post<T = unknown>(
        endpoint: WooRestApiEndpoint,
        data: Record<string, unknown>,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        return this._request("POST", endpoint, data, params).then((response) => ({
            data: response.data as T,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as WooCommerceApiResponse<T>["headers"],
        }));
    }

    put<T = unknown>(
        endpoint: WooRestApiEndpoint,
        data: Record<string, unknown>,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        return this._request("PUT", endpoint, data, params).then((response) => ({
            data: response.data as T,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as WooCommerceApiResponse<T>["headers"],
        }));
    }

    delete<T = unknown>(
        endpoint: WooRestApiEndpoint,
        data: Pick<WooRestApiParams, "force">,
        params: Pick<WooRestApiParams, "id">,
    ): Promise<WooCommerceApiResponse<T>> {
        return this._request("DELETE", endpoint, data, params).then((response) => ({
            data: response.data as T,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as WooCommerceApiResponse<T>["headers"],
        }));
    }

    options<T = unknown>(
        endpoint: WooRestApiEndpoint,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        return this._request("OPTIONS", endpoint, {}, params).then((response) => ({
            data: response.data as T,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as WooCommerceApiResponse<T>["headers"],
        }));
    }

    // Convenience methods (still available for DX; fully typed)
    async getProducts(params?: Record<string, unknown>): Promise<WooCommerceApiResponse<Products[]>> {
        return this.get<Products[]>("products", params);
    }

    async getProduct(id: number): Promise<WooCommerceApiResponse<Products>> {
        return this.get<Products>("products", { id });
    }

    async createProduct(productData: Partial<Products>): Promise<WooCommerceApiResponse<Products>> {
        return this.post<Products>("products", productData);
    }

    async updateProduct(id: number, productData: Partial<Products>): Promise<WooCommerceApiResponse<Products>> {
        return this.put<Products>("products", productData, { id });
    }

    async getOrders(params?: Record<string, unknown>): Promise<WooCommerceApiResponse<Orders[]>> {
        return this.get<Orders[]>("orders", params);
    }

    async getOrder(id: number): Promise<WooCommerceApiResponse<Orders>> {
        return this.get<Orders>("orders", { id });
    }

    async createOrder(orderData: Partial<Orders>): Promise<WooCommerceApiResponse<Orders>> {
        return this.post<Orders>("orders", orderData);
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

// Error classes are now defined in src/types/errors (with proper extends Error) and re-exported above.
// The old non-Error OptionsException and any-typed WooCommerceApiError have been removed for security + correctness.

// Re-export the new reusable helpers (additive, full backward compat)
export { parsePaginationHeaders, collectAllPages, type PaginationInfo } from "./utils/PaginationHelper.js";
