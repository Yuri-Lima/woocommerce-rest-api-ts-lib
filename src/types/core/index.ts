import type { AxiosRequestConfig } from "axios";

/**
 * Supported WooCommerce REST API version.
 */
export type WooRestApiVersion = "wc/v3";

/**
 * Supported response encodings.
 */
export type WooRestApiEncoding = "utf-8" | "ascii";

/**
 * HTTP methods supported by the client.
 */
export type WooRestApiMethod = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";

/**
 * Known WooCommerce REST API endpoints (extensible via string).
 * Using a union + string for autocomplete + custom endpoint support (e.g. "orders/123/notes").
 */
export type WooRestApiEndpoint =
  | "coupons"
  | "customers"
  | "orders"
  | "products"
  | "products/attributes"
  | "products/categories"
  | "products/shipping_classes"
  | "products/tags"
  | "products/reviews"
  | "system_status"
  | "reports"
  | "settings"
  | "webhooks"
  | "shipping"
  | "shipping_methods"
  | "taxes"
  | "payment_gateways"
  | string;

/**
 * Base credentials required for all API access.
 */
export type IWooCredentials = {
  /** Your API consumer key (ck_...) */
  consumerKey: string;
  /** Your API consumer secret (cs_...) */
  consumerSecret: string;
};

/**
 * Retry/backoff configuration for resilience against transients and rate limits.
 */
export interface RetryConfig {
  /** Max retry attempts after initial (0 = disabled for full backward compat). */
  retries?: number;
  /** Base delay (ms) before exponential backoff + jitter. */
  retryDelay?: number;
  /** Status codes that are retryable (in addition to network errors). */
  retryOn?: number[];
}

/**
 * Core library options (without the axiosConfig generic to keep concerns clean).
 * Consumers extend via IWooRestApiOptions<AxiosRequestConfig>.
 */
export interface IWooRestApiOptions<T = unknown> extends IWooCredentials {
  /** Your Store URL, e.g. https://example.com */
  url: string;

  /** Custom WP REST API URL prefix (default: wp-json) */
  wpAPIPrefix?: string;

  /** API version (default: wc/v3) */
  version?: WooRestApiVersion;

  /** Response encoding (default: utf-8) */
  encoding?: WooRestApiEncoding;

  /** Force Basic Auth via query string even on HTTPS (default: false) */
  queryStringAuth?: boolean;

  /** Custom port for the store URL */
  port?: number;

  /** Request timeout in ms (enforced default 30000 if unset/<=0) */
  timeout?: number;

  /** Full custom Axios config (merged, user values win). Use for interceptors, adapter, etc. */
  axiosConfig?: T;

  /** Internal library version stamp */
  classVersion?: string;

  /** Inferred: whether the base URL is https */
  isHttps?: boolean;

  /**
   * Max response body size in bytes (defense-in-depth for resource exhaustion).
   * Default 10MB. Set -1 only if you explicitly need unbounded (not recommended).
   */
  maxContentLength?: number;

  /**
   * Max request body size in bytes.
   * Default 10MB.
   */
  maxBodyLength?: number;

  /**
   * Client-side max concurrent in-flight requests (0 = unlimited, backward compat).
   * Enables internal queueing/throttling to protect local resources.
   */
  maxConcurrentRequests?: number;

  /** Retry strategy (opt-in; default disabled for timing compat). */
  retryConfig?: RetryConfig;
}

/**
 * Convenience alias that wires the generic to real Axios config.
 */
export type WooRestApiOptions = IWooRestApiOptions<AxiosRequestConfig>;

/**
 * Query shape used internally.
 */
export type IWooRestApiQuery = Record<string, unknown>;
