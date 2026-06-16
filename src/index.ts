import axios, { RawAxiosRequestHeaders, AxiosRequestConfig } from "axios";
import crypto from "node:crypto";
import OAuth from "oauth-1.0a";
import Url from "url-parse";
import {
    WooRestApiMethod,
    // IWooRestApiQuery,
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
} from "./typesANDinterfaces.js"; // Typescript types for the library

export {
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
} from "./typesANDinterfaces.js"; // Export all the types

/**
 * Set the axiosConfig property to the axios config object.
 * Could reveive any axios |... config objects.
 * @param {AxiosRequestConfig} axiosConfig
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

/**
 * Response wrapper for API calls
 */
export interface WooCommerceApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
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
     * Set default options
     */
        this._setDefaultsOptions(this._opt);
    }

    /**
   * Set default options
   *
   * @param {Object} opt
   */
    _setDefaultsOptions(opt: T): void {
        this._opt.wpAPIPrefix = opt.wpAPIPrefix || "wp-json";
        this._opt.version = opt.version || "wc/v3";
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
    private async _executeWithRetry(options: AxiosRequestConfig): Promise<any> {
        const retryCfg = this._opt.retryConfig ?? {};
        const maxRetries = retryCfg.retries ?? 0; // 0 = no retries by default (full backward compat on error paths/timings). Set >0 to enable resilience + rate limit backoff.
        const baseDelay = retryCfg.retryDelay ?? 1000;
        const retryableStatuses: number[] = retryCfg.retryOn ?? [408, 429, 500, 502, 503, 504];

        let lastError: any;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await axios(options);
            } catch (error: any) {
                lastError = error;

                const status: number | undefined = error?.response?.status;
                const isNetworkError = !error.response || error.code === "ECONNRESET" || error.code === "ETIMEDOUT" || error.code === "ECONNABORTED";
                const isRetryableStatus = !status || retryableStatuses.includes(status);

                const shouldRetry = attempt < maxRetries && (isNetworkError || isRetryableStatus);

                if (!shouldRetry) {
                    throw error;
                }

                // Calculate exponential backoff with jitter
                let delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);

                // Rate limiting awareness: honor Retry-After on 429 if present (seconds or HTTP date)
                if (status === 429) {
                    const retryAfterHeader = error.response?.headers?.["retry-after"];
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
   * @param  {String} endpoint
   * @param  {Object} params
   *
   * @return {String}
   */
    _getUrl(endpoint: string, params: Partial<Record<string, unknown>>): string {
        const api = this._opt.wpAPIPrefix + "/"; // Add prefix to endpoint

        let url =
      this._opt.url.slice(-1) === "/" ? this._opt.url : this._opt.url + "/";

        url = url + api + this._opt.version + "/" + endpoint;
        // Add id param to url
        if (params.id) {
            url = url + "/" + params.id;
            delete params.id;
        }

        // Add query params to url
        if (Object.keys(params).length !== 0) {
            const queryString = Object.entries(params)
                .map(
                    ([key, value]) =>
                        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
                )
                .join("&");
            url = `${url}?${queryString}`;
        }

        /**
     * If port is defined, add it to the url
     */
        if (this._opt.port) {
            const hostname = new Url(url).hostname;
            url = url.replace(hostname, hostname + ":" + this._opt.port);
        }

        /**
     * If isHttps is true, normalize the query string
     */
        // if (this._opt.isHttps) {
        //     url = this._normalizeQueryString(url, params);
        //     return url;
        // }
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
    ): Promise<any> {
        const url = this._getUrl(endpoint, params);

        const header: RawAxiosRequestHeaders = {
            Accept: "application/json",
        };
        // only set "User-Agent" in node environment
        // the checking method is identical to upstream axios
        if (
            typeof process !== "undefined" &&
      Object.prototype.toString.call(process) === "[object process]"
        ) {
            header["User-Agent"] =
        "WooCommerce REST API - TS Client/" + this._opt.classVersion;
        }

        // Secure defaults for resource limits (CVE-2026-44488 mitigation) and timeout enforcement.
        // 10MB is a conservative default suitable for typical WooCommerce REST payloads.
        // Users may override via top-level options or axiosConfig (last write wins for explicit).
        const DEFAULT_MAX_CONTENT_LENGTH = 10 * 1024 * 1024;
        const DEFAULT_MAX_BODY_LENGTH = 10 * 1024 * 1024;
        const DEFAULT_TIMEOUT = 30000;

        // Determine explicit user intent from axiosConfig for overrides (including -1 / 0 to relax)
        const axCfg: any = this._opt.axiosConfig ?? {};
        const explicitMaxContent = "maxContentLength" in axCfg ? axCfg.maxContentLength : undefined;
        const explicitMaxBody = "maxBodyLength" in axCfg ? axCfg.maxBodyLength : undefined;
        const explicitTimeout = "timeout" in axCfg ? axCfg.timeout : undefined;

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

        // Throttling + retry-protected execution. Acquire slot for the logical request (held across retries).
        await this._acquireSlot();
        try {
            return await this._executeWithRetry(options);
        } catch (error: any) {
            // Enhanced error handling
            if (error.response) {
                const apiError = new WooCommerceApiError(
                    error.response.data?.message || error.message || "API request failed",
                    error.response.status,
                    error.response.data,
                    endpoint,
                );
                throw apiError;
            } else if (error.request) {
                throw new WooCommerceApiError(
                    "Network error: No response received from server",
                    0,
                    null,
                    endpoint,
                );
            } else {
                throw new WooCommerceApiError(
                    `Request setup error: ${error.message}`,
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
    get<T = any>(
        endpoint: WooRestApiEndpoint,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        return this._request("GET", endpoint, undefined, params).then(
            (response) => ({
                data: response.data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            }),
        );
    }

    /**
   * POST requests
   *
   * @param  {String} endpoint
   * @param  {Object} data
   * @param  {Object} params
   *
   * @return {Object}
   */
    post<T = any>(
        endpoint: WooRestApiEndpoint,
        data: Record<string, unknown>,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        return this._request("POST", endpoint, data, params).then((response) => ({
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        }));
    }

    /**
   * PUT requests
   *
   * @param  {String} endpoint
   * @param  {Object} data
   * @param  {Object} params
   *
   * @return {Object}
   */
    put<T = any>(
        endpoint: WooRestApiEndpoint,
        data: Record<string, unknown>,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        return this._request("PUT", endpoint, data, params).then((response) => ({
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        }));
    }

    /**
   * DELETE requests
   *
   * @param  {String} endpoint
   * @param  {Object} params
   * @param  {Object} params
   *
   * @return {Object}
   */
    delete<T = any>(
        endpoint: WooRestApiEndpoint,
        data: Pick<WooRestApiParams, "force">,
        params: Pick<WooRestApiParams, "id">,
    ): Promise<WooCommerceApiResponse<T>> {
        return this._request("DELETE", endpoint, data, params).then((response) => ({
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        }));
    }

    /**
   * OPTIONS requests
   *
   * @param  {String} endpoint
   * @param  {Object} params
   *
   * @return {Object}
   */
    options<T = any>(
        endpoint: WooRestApiEndpoint,
        params?: Partial<WooRestApiParams>,
    ): Promise<WooCommerceApiResponse<T>> {
        return this._request("OPTIONS", endpoint, {}, params).then((response) => ({
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        }));
    }

    // Convenience methods with proper typing
    /**
   * Get all products with proper typing
   */
    async getProducts(
        params?: Record<string, any>,
    ): Promise<WooCommerceApiResponse<Products[]>> {
        return this.get<Products[]>("products", params);
    }

    /**
   * Get a single product by ID
   */
    async getProduct(id: number): Promise<WooCommerceApiResponse<Products>> {
        return this.get<Products>("products", { id });
    }

    /**
   * Create a new product
   */
    async createProduct(
        productData: Partial<Products>,
    ): Promise<WooCommerceApiResponse<Products>> {
        return this.post<Products>("products", productData);
    }

    /**
   * Update an existing product
   */
    async updateProduct(
        id: number,
        productData: Partial<Products>,
    ): Promise<WooCommerceApiResponse<Products>> {
        return this.put<Products>("products", productData, { id });
    }

    /**
   * Get all orders with proper typing
   */
    async getOrders(
        params?: Record<string, any>,
    ): Promise<WooCommerceApiResponse<Orders[]>> {
        return this.get<Orders[]>("orders", params);
    }

    /**
   * Get a single order by ID
   */
    async getOrder(id: number): Promise<WooCommerceApiResponse<Orders>> {
        return this.get<Orders>("orders", { id });
    }

    /**
   * Create a new order
   */
    async createOrder(
        orderData: Partial<Orders>,
    ): Promise<WooCommerceApiResponse<Orders>> {
        return this.post<Orders>("orders", orderData);
    }

    /**
   * Get all customers with proper typing
   */
    async getCustomers(
        params?: Partial<CustomersParams>,
    ): Promise<WooCommerceApiResponse<Customers[]>> {
        return this.get<Customers[]>("customers", params);
    }

    /**
   * Get a single customer by ID
   */
    async getCustomer(id: number): Promise<WooCommerceApiResponse<Customers>> {
        return this.get<Customers>("customers", { id });
    }

    /**
   * Get all coupons with proper typing
   */
    async getCoupons(
        params?: Partial<CouponsParams>,
    ): Promise<WooCommerceApiResponse<Coupons[]>> {
        return this.get<Coupons[]>("coupons", params);
    }

    /**
   * Get system status
   */
    async getSystemStatus(): Promise<WooCommerceApiResponse<SystemStatus>> {
        return this.get<SystemStatus>("system_status");
    }
}

/**
 * WooCommerce API Error.
 */
export class WooCommerceApiError extends Error {
    constructor(
        message: string,
    public statusCode?: number,
    public response?: any,
    public endpoint?: string,
    ) {
        super(message);
        this.name = "WooCommerceApiError";
    }
}

/**
 * Authentication Error.
 */
export class AuthenticationError extends WooCommerceApiError {
    constructor(message = "Authentication failed") {
        super(message, 401);
        this.name = "AuthenticationError";
    }
}

/**
 * Options Exception.
 */
export class OptionsException {
    public name: "Options Error";
    public message: string;
    /**
   * Constructor.
   *
   * @param {String} message
   */
    constructor(message: string) {
        this.name = "Options Error";
        this.message = message;
    }
}
