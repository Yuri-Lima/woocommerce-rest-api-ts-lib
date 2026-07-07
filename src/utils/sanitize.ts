/**
 * RequestSanitizer utilities.
 * Extracted for reusability, testability, and to support future HttpClientBase / UrlBuilder.
 * All functions throw OptionsException (proper Error) on invalid input.
 */

import { OptionsException } from "../types/index.js";
import type { WooRestApiVersion } from "../types/options/index.js";

// Re-export from the single source of truth (src/types/options) for callers that imported from sanitize.
export type { WooRestApiVersion } from "../types/options/index.js";

const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;

export function sanitizePathSegment(segment: string, name: string): string {
    if (typeof segment !== "string" || segment.length === 0) {
        throw new OptionsException(`${name} must be a non-empty string`);
    }
    // Check raw input first for obvious traversal attempts (before any collapsing)
    if (segment.includes("..")) {
        throw new OptionsException(`Invalid ${name}: contains path traversal or illegal characters`);
    }
    const cleaned = segment
        .replace(/\.+/g, ".")
        .replace(/\/+/g, "/")
        .replace(/^\/+|\/+$/g, "");

    if (cleaned.includes("..") || cleaned.includes("/") || !SAFE_SEGMENT.test(cleaned)) {
        throw new OptionsException(`Invalid ${name}: contains path traversal or illegal characters`);
    }
    return cleaned;
}

export function sanitizeEndpoint(endpoint: string): string {
    if (typeof endpoint !== "string" || endpoint.length === 0) {
        throw new OptionsException("endpoint must be a non-empty string");
    }
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(endpoint) || endpoint.includes("://") || endpoint.startsWith("/") || endpoint.includes("..") || /[?#]/.test(endpoint)) {
        throw new OptionsException("Invalid endpoint: must be a relative path segment without traversal or protocol");
    }
    const parts = endpoint.split("/").filter(Boolean);
    const safeParts = parts.map((p, i) => sanitizePathSegment(p, `endpoint part[${i}]`));
    return safeParts.join("/");
}

export function sanitizeApiVersion(v: string): WooRestApiVersion {
    const cleaned = String(v || "").trim().replace(/^\/+|\/+$/g, "");
    if (cleaned.includes("..") || cleaned.split("/").length > 2 || !/^[a-zA-Z0-9/._-]+$/.test(cleaned)) {
        throw new OptionsException("Invalid version: contains path traversal or illegal characters");
    }
    return cleaned as WooRestApiVersion;
}

export function validateBaseUrl(urlStr: string): URL {
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
