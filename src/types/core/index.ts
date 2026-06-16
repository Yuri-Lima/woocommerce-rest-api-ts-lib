/**
 * Core types for the WooCommerce REST API client.
 * Separated for strict concerns, tree-shaking, and clarity.
 */

export type WooRestApiVersion = "wc/v3";

export type WooRestApiEncoding = "utf-8" | "ascii";

export type WooRestApiMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "OPTIONS";

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
  | string; // allow extension for notes etc.

export type IWooRestApiQuery = Record<string, unknown>;

export type IWooCredentials = {
  consumerKey: string;
  consumerSecret: string;
};

export interface IWooRestApiOptions<T = unknown> extends IWooCredentials {
  url: string;
  wpAPIPrefix?: string;
  version?: WooRestApiVersion;
  encoding?: WooRestApiEncoding;
  queryStringAuth?: boolean;
  port?: number;
  timeout?: number;
  axiosConfig?: T;
  classVersion?: string;
  isHttps?: boolean;
  maxContentLength?: number;
  maxBodyLength?: number;
  maxConcurrentRequests?: number;
  retryConfig?: {
    retries?: number;
    retryDelay?: number;
    retryOn?: number[];
  };
}

export type WooRestApiOptions = IWooRestApiOptions;

export interface WooCommerceApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string | string[] | number | undefined>;
}
