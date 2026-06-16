/**
 * Public type barrel.
 * Re-exports everything so that:
 *   import { Products, WooCommerceApiError, IWooRestApiOptions, ... } from "woocommerce-rest-ts-api"
 * and internal imports continue to work after the split.
 *
 * This fulfills the requirement for dedicated folders + barrel exports.
 */

// Core
export * from "./core";

// Errors
export * from "./errors";

// Models (entities)
export * from "./models";

// Requests / params
export * from "./requests";

// Responses
export * from "./responses";

// Legacy named exports for full backward compat (some were only in old file)
export type { DELETE } from "./requests";
