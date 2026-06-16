/**
 * Core types for the WooCommerce REST API client.
 * Separated for strict concerns, tree-shaking, and clarity.
 * Options-related types live in ../options (per architecture requirements) and are re-exported here for compatibility.
 */

export type {
    WooRestApiVersion,
    WooRestApiEncoding,
    IWooCredentials,
    IWooRestApiOptions,
    WooRestApiOptions,
    WooCommerceApiResponse,
} from "../options/index.js";

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
