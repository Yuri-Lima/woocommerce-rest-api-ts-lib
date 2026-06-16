import axios, { RawAxiosRequestHeaders, AxiosRequestConfig, AxiosError } from "axios";
import crypto from "node:crypto";
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
    WooRestApiVersion,
} from "./types/index.js";
import {
    WooCommerceApiError,
    OptionsException,
} from "./types/index.js";

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

/* =========================================================
 * SECURITY: Input sanitization + path validation helpers
 * Prevents path traversal, protocol confusion, and bad segments
 * in constructed WooCommerce REST URLs.
 * ========================================================= */

const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;

function sanitizePathSegment(segment: string, name: string): string {
    if (typeof segment !== "string" || segment.length === 0) {
        throw new OptionsException(`${name} must be a non-empty string`);
    }
    // Strip dangerous sequences
    const cleaned = segment
        .replace(/\.+/g, ".") // collapse ..
        .replace(/\/+/g, "/")
        .replace(/^\/+|\/+$/g, ""); // no leading/trailing slashes in segments

    if (cleaned.includes("..") || cleaned.includes("/") || !SAFE_SEGMENT.test(cleaned)) {
        throw new OptionsException(`Invalid ${name}: contains path traversal or illegal characters`);
    }
    return cleaned;
}

function sanitizeEndpoint(endpoint: string): string {
    if (typeof endpoint !== "string" || endpoint.length === 0) {
        throw new OptionsException("endpoint must be a non-empty string");
    }
    // Disallow protocol, absolute paths, traversal, query/hash in endpoint
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(endpoint) || endpoint.includes("://") || endpoint.startsWith("/") || endpoint.includes("..") || /[?#]/.test(endpoint)) {
        throw new OptionsException("Invalid endpoint: must be a relative path segment without traversal or protocol");
    }
    // Allow nested like products/attributes but sanitize each part
    const parts = endpoint.split("/").filter(Boolean);
    const safeParts = parts.map((p, i) => sanitizePathSegment(p, `endpoint part[${i}]`));
    return safeParts.join("/");
}

/**
 * Version may be "wc/v3" (contains exactly one /). Special sanitizer.
 */
function sanitizeApiVersion(v: string): WooRestApiVersion {
    const cleaned = String(v || "").trim().replace(/^\/+|\/+$/g, "");
    if (cleaned.includes("..") || cleaned.split("/").length > 2 || !/^[a-zA-Z0-9/._-]+$/.test(cleaned)) {
        throw new OptionsException("Invalid version: contains path traversal or illegal characters");
    }
    return cleaned as WooRestApiVersion;
}

function validateBaseUrl(urlStr: string): URL {
    let u: URL;
    try {
        u = new URL(urlStr);
    } catch {
        throw new OptionsException("url must be a valid absolute URL (http/https)");
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
        throw new OptionsException("url must use http or https protocol");
    }
    return u;
}

/**
 * WooCommerce REST API wrapper
 *
 * @param {Object} opt
 */
export default class WooCommerceRestApi<T extends WooRestApiOptions> {
    protected _opt: T;

    // Security / resource control state for throttling (CVE-2026-44488 mitigation)
    private _maxConcurrentRequests: number = 0;
    private _currentConcurrentRequests: number = 0;
    private _requestQueue: Array<() => void> = [];

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
        this._opt.classVersion = "0.0.2";

        // Initialize throttling limit (0 = unlimited for backward compatibility)
        this._maxConcurrentRequests = opt.maxConcurrentRequests ?? 0;
    }

    /**
   * Acquire a concurrency slot for throttling.
   * If maxConcurrentRequests <= 0, no throttling is applied.
   */
    private async _acquireSlot(): Promise<void> {
        if (this._maxConcurrentRequests <= 0) {
            return;
        }
        if (this._currentConcurrentRequests < this._maxConcurrentRequests) {
            this._currentConcurrentRequests++;
            return;
        }
        // Queue the request
        return new Promise<void>((resolve) => {
            this._requestQueue.push(() => {
                this._currentConcurrentRequests++;
                resolve();
            });
        });
    }

    /**
   * Release a concurrency slot and wake next waiter if any.
   */
    private _releaseSlot(): void {
        if (this._maxConcurrentRequests <= 0) {
            return;
        }
        this._currentConcurrentRequests = Math.max(0, this._currentConcurrentRequests - 1);
        const next = this._requestQueue.shift();
        if (next) {
            next();
        }
    }

    /**
   * Core axios execution with exponential backoff and rate-limit (429) awareness.
   * Retries on network errors and configured retryable status codes.
   */
    private async _executeWithRetry(options: AxiosRequestConfig): Promise<import("axios").AxiosResponse> {
        const retryCfg = this._opt.retryConfig ?? {};
        const maxRetries = retryCfg.retries ?? 0;
        const baseDelay = retryCfg.retryDelay ?? 1000;
        const retryableStatuses: number[] = retryCfg.retryOn ?? [408, 429, 500, 502, 503, 504];

        let lastError: unknown;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await axios(options);
            } catch (error: unknown) {
                lastError = error;

                const err = error as AxiosError;
                const status: number | undefined = err.response?.status;
                const isNetworkError = !err.response || err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "ECONNABORTED";
                const isRetryableStatus = !status || retryableStatuses.includes(status);

                const shouldRetry = attempt < maxRetries && (isNetworkError || isRetryableStatus);

                if (!shouldRetry) {
                    throw error;
                }

                // Calculate exponential backoff with jitter
                let delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);

                // Rate limiting awareness: honor Retry-After on 429 if present (seconds or HTTP date)
                const errForRetry = error as { response?: { headers?: Record<string, unknown> } };
                if (status === 429) {
                    const retryAfterHeader = errForRetry.response?.headers?.["retry-after"];
                    if (retryAfterHeader != null) {
                        const asSeconds = parseInt(String(retryAfterHeader), 10);
                        if (!Number.isNaN(asSeconds) && asSeconds > 0) {
                            delay = Math.max(delay, asSeconds * 1000);
                        } else {
                            const asDate = new Date(String(retryAfterHeader));
                            if (!Number.isNaN(asDate.getTime())) {
                                const delta = asDate.getTime() - Date.now();
                                if (delta > 0) delay = Math.max(delay, delta);
                            }
                        }
                    }
                }

                // Cap the delay to avoid excessive wait (30s max)
                delay = Math.min(delay, 30000);

                await new Promise((resolve) => setTimeout(resolve, Math.floor(delay)));
            }
        }

        throw lastError;
    }

    /**
   * Parse params to object.
   *
   * @param {Object} params
   * @param {Object} query
   * @return {Object} IWooRestApiQuery
   */
    // _parseParamsObject<T>(params: Record<string, T>, query: Record<string, any>): IWooRestApiQuery {
    //     for (const key in params) {
    //         if (typeof params[key] === "object") {
    //             // If the value is an object, loop through it and add it to the query object
    //             for (const subKey in params[key]) {
    //                 query[key + "[" + subKey + "]"] = params[key][subKey];
    //             }
    //         } else {
    //             query[key] = params[key]; // If the value is not an object, add it to the query object
    //         }
    //     }
    //     return query; // Return the query object
    // }

    /**
   * Normalize query string for oAuth 1.0a
   * Depends on the _parseParamsObject method
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

        // console.log("params:", params);
        const values = [];

        let queryString = "";

        // Include params object into URL.searchParams.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        // const a = this._parseParamsObject(params, query);
        // console.log("A:", a);

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
            hash_function: (base: any, key: any) => {
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

        let options: AxiosRequestConfig = {
            url,
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

            options.params = { ...options.params, ...params };
        } else {
            options.params = this._getOAuth().authorize({
                url,
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
            const err = error as AxiosError & { request?: unknown };
            if (err.response) {
                const apiError = new WooCommerceApiError(
                    (err.response.data as { message?: string })?.message || err.message || "API request failed",
                    err.response.status,
                    err.response.data,
                    endpoint,
                );
                throw apiError;
            } else if (err.request) {
                throw new WooCommerceApiError(
                    "Network error: No response received from server",
                    0,
                    null,
                    endpoint,
                );
            } else {
                throw new WooCommerceApiError(
                    `Request setup error: ${err.message}`,
                    0,
                    null,
                    endpoint,
                );
            }
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
