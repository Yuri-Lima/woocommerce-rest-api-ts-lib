/**
 * Barrel export for all library types.
 * Consumers import { Products, Orders, WooRestApiOptions, ... } from "woocommerce-rest-ts-api"
 * This structure separates concerns (core / models / responses / requests / errors) while
 * preserving a single import surface for backward compatibility.
 */

// Core configuration + primitives
export * from "./core/index";

// Errors (properly extending Error with prototype fixes)
export * from "./errors/index";

// Shared models (billing, line items, meta, dimensions, system sub-objects, etc.)
export * from "./models/index";

// Response entity shapes + the ApiResponse wrapper
export * from "./responses/index";

// Request / param shapes + DELETE helper + MainParams unions
export * from "./requests/index";
