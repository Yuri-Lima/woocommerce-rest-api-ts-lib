/**
 * Pure helpers for URL building — no admin OAuth / no CK/CS.
 */

import { StoreApiOptionsError } from "./errors.js";

const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;

export function validateBaseUrl(urlStr: string): URL {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    throw new StoreApiOptionsError("url must be a valid absolute URL (http/https)");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new StoreApiOptionsError("url must use http or https protocol");
  }
  return u;
}

export function sanitizePathSegment(segment: string, name: string): string {
  if (typeof segment !== "string" || segment.length === 0) {
    throw new StoreApiOptionsError(`${name} must be a non-empty string`);
  }
  if (segment.includes("..")) {
    throw new StoreApiOptionsError(
      `Invalid ${name}: contains path traversal or illegal characters`,
    );
  }
  const cleaned = segment
    .replace(/\.+/g, ".")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (
    cleaned.includes("..") ||
    cleaned.includes("/") ||
    !SAFE_SEGMENT.test(cleaned)
  ) {
    throw new StoreApiOptionsError(
      `Invalid ${name}: contains path traversal or illegal characters`,
    );
  }
  return cleaned;
}

/**
 * Relative Store API path (no leading slash, no query, no protocol).
 * Examples: "cart", "cart/add-item", "products/12"
 */
export function sanitizeEndpoint(endpoint: string): string {
  if (typeof endpoint !== "string" || endpoint.length === 0) {
    throw new StoreApiOptionsError("endpoint must be a non-empty string");
  }
  if (
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(endpoint) ||
    endpoint.includes("://") ||
    endpoint.startsWith("/") ||
    endpoint.includes("..") ||
    /[?#]/.test(endpoint)
  ) {
    throw new StoreApiOptionsError(
      "Invalid endpoint: must be a relative path without traversal or protocol",
    );
  }
  const parts = endpoint.split("/").filter(Boolean);
  return parts.map((p, i) => sanitizePathSegment(p, `endpoint part[${i}]`)).join("/");
}

/**
 * Store API version path, e.g. `wc/store/v1` (up to 3 segments).
 * Admin REST uses `wc/v3` (2 segments) — this package only targets Store.
 */
export function sanitizeApiVersion(v: string): string {
  const cleaned = String(v || "").trim().replace(/^\/+|\/+$/g, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (
    cleaned.includes("..") ||
    parts.length < 1 ||
    parts.length > 3 ||
    !/^[a-zA-Z0-9/._-]+$/.test(cleaned)
  ) {
    throw new StoreApiOptionsError(
      "Invalid version: expected e.g. wc/store/v1 (path traversal not allowed)",
    );
  }
  return cleaned;
}

export interface Throttler {
  acquire(): Promise<void>;
  release(): void;
}

export class ConcurrencyThrottler implements Throttler {
  private current = 0;
  private readonly queue: Array<() => void> = [];
  private readonly maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire(): Promise<void> {
    if (this.maxConcurrent <= 0) return;
    if (this.current < this.maxConcurrent) {
      this.current++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.current++;
        resolve();
      });
    });
  }

  release(): void {
    if (this.maxConcurrent <= 0) return;
    this.current = Math.max(0, this.current - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

export function createThrottler(maxConcurrentRequests?: number): Throttler {
  return new ConcurrencyThrottler(maxConcurrentRequests ?? 0);
}
