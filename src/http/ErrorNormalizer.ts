/**
 * ErrorNormalizer.
 * Central place to convert Axios errors (and other) into our public WooCommerceApiError.
 * Enables consistent error shape, future mapping of more error kinds, and testing.
 */

import type { AxiosError } from "axios";
import { WooCommerceApiError } from "../types/index.js";

export interface NormalizedRequestContext {
    endpoint: string;
}

export function normalizeAxiosError(error: unknown, context: NormalizedRequestContext): WooCommerceApiError {
    const err = error as AxiosError & { request?: unknown; message?: string };

    if (err.response) {
        return new WooCommerceApiError(
            (err.response.data as { message?: string })?.message || err.message || "API request failed",
            err.response.status,
            err.response.data,
            context.endpoint,
        );
    } else if (err.request) {
        return new WooCommerceApiError(
            "Network error: No response received from server",
            0,
            null,
            context.endpoint,
        );
    } else {
        return new WooCommerceApiError(
            `Request setup error: ${err.message || "unknown"}`,
            0,
            null,
            context.endpoint,
        );
    }
}
