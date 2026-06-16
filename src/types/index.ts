/**
 * Public type barrel.
 * Re-exports everything so that:
 *   import { Products, WooCommerceApiError, IWooRestApiOptions, ... } from "woocommerce-rest-ts-api"
 * and internal imports continue to work after the split.
 *
 * This fulfills the requirement for dedicated folders + barrel exports.
 */

// Core (includes re-exports of options types for backward compat)
export * from "./core";

// Dedicated options folder (architecture requirement)
export * from "./options";

// Errors
export * from "./errors";

// Models (entities)
export * from "./models";

// Requests / params
export * from "./requests";

// Responses (re-exports from core/options)
export * from "./responses";

// Legacy named exports for full backward compat (some were only in old file)
export type { DELETE } from "./requests";
