/**
 * WooCommerce API client factory with rate limiting.
 *
 * Uses the library's built-in Throttler (via maxConcurrentRequests) and an
 * additional token-bucket style limiter driven by WC_RATE_LIMIT_PER_SECOND.
 * Does NOT rewrite OAuth/HTTP — delegates entirely to WooCommerceRestApi.
 */

import WooCommerceRestApiImport, {
  parsePaginationHeaders,
  type WooCommerceApiResponse,
} from "woocommerce-rest-ts-api";
import type { McpConfig } from "./config.js";

// CJS/ESM interop: default export may be nested under .default when resolved via NodeNext.
const WooCommerceRestApi =
  (WooCommerceRestApiImport as unknown as { default?: typeof WooCommerceRestApiImport })
    .default ?? WooCommerceRestApiImport;

/**
 * Minimal Throttler interface matching the library's src/http/Throttler.ts.
 * We re-implement the same concurrency limiter here because the class is not
 * part of the package public exports, while still following its contract so
 * the MCP layer stays aligned with the library's throttling model.
 */
export interface Throttler {
  acquire(): Promise<void>;
  release(): void;
}

/**
 * Concurrency throttler (same algorithm as woocommerce-rest-ts-api Throttler).
 */
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

/**
 * Token-bucket rate limiter + optional concurrency gate.
 *
 * Previous spacing chain serialized every start at 1000/RPS ms, which:
 * - forbade bursts even when the bucket had capacity
 * - stacked with the library's own Throttler (double throttle)
 *
 * Token bucket allows up to `requestsPerSecond` burst tokens, refilling at
 * `requestsPerSecond` tokens/sec. Concurrent in-flight work is limited
 * separately so slow WC responses do not starve the queue.
 */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillPerMs: number;
  private lastRefillMs: number;
  private readonly throttler: Throttler;
  /** FIFO of waiters when the bucket is empty */
  private waiters: Array<() => void> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(requestsPerSecond: number, maxConcurrent?: number) {
    const rps = Math.max(1, requestsPerSecond);
    this.maxTokens = rps;
    this.tokens = rps;
    this.refillPerMs = rps / 1000;
    this.lastRefillMs = Date.now();
    // Cap default concurrency so a burst does not open unbounded sockets.
    // Library-side maxConcurrentRequests is disabled (0) — single throttle point.
    this.throttler = new ConcurrencyThrottler(
      maxConcurrent ?? Math.min(rps, 8),
    );
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillMs;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillPerMs);
    this.lastRefillMs = now;
  }

  private scheduleWake(): void {
    if (this.timer || this.waiters.length === 0) return;
    // Time until one full token is available
    const need = 1 - this.tokens;
    const waitMs = Math.max(1, Math.ceil(need / this.refillPerMs));
    this.timer = setTimeout(() => {
      this.timer = null;
      this.refill();
      this.drainWaiters();
    }, waitMs);
    // Don't keep the process alive solely for rate-limit timers
    if (typeof this.timer === "object" && "unref" in this.timer) {
      this.timer.unref();
    }
  }

  private drainWaiters(): void {
    this.refill();
    while (this.waiters.length > 0 && this.tokens >= 1) {
      this.tokens -= 1;
      const next = this.waiters.shift()!;
      next();
    }
    if (this.waiters.length > 0) this.scheduleWake();
  }

  private acquireToken(): Promise<void> {
    this.refill();
    if (this.tokens >= 1 && this.waiters.length === 0) {
      this.tokens -= 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
      this.scheduleWake();
    });
  }

  /**
   * Schedule `fn` to run respecting both rate and concurrency limits.
   */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireToken();
    await this.throttler.acquire();
    try {
      return await fn();
    } finally {
      this.throttler.release();
    }
  }
}

/** Minimal surface we need from WooCommerceRestApi (avoids default-export type issues). */
export interface WooApi {
  get<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<WooCommerceApiResponse<T>>;
  post<T = unknown>(
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, unknown>,
  ): Promise<WooCommerceApiResponse<T>>;
  put<T = unknown>(
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, unknown>,
  ): Promise<WooCommerceApiResponse<T>>;
  delete<T = unknown>(
    endpoint: string,
    data?: { force?: boolean },
    params?: { id?: number },
  ): Promise<WooCommerceApiResponse<T>>;
  options<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<WooCommerceApiResponse<T>>;
}

export interface WooClient {
  api: WooApi;
  rateLimiter: RateLimiter;
  config: McpConfig;
  /** Rate-limited GET */
  get<T = unknown>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<WooCommerceApiResponse<T>>;
  /** Rate-limited POST */
  post<T = unknown>(
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, unknown>,
  ): Promise<WooCommerceApiResponse<T>>;
  /** Rate-limited PUT */
  put<T = unknown>(
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, unknown>,
  ): Promise<WooCommerceApiResponse<T>>;
  /** Rate-limited DELETE */
  delete<T = unknown>(
    endpoint: string,
    data?: { force?: boolean },
    params?: { id?: number },
  ): Promise<WooCommerceApiResponse<T>>;
  /** Extract pagination meta from a list response */
  pagination(
    response: WooCommerceApiResponse<unknown>,
    page: number,
    perPage: number,
  ): { total: number; totalPages: number; currentPage: number; perPage: number };
}

/**
 * Create a rate-limited WooCommerce client from validated config.
 */
export function createWooClient(config: McpConfig): WooClient {
  // Single throttle point at MCP layer (token bucket + concurrency).
  // Library maxConcurrentRequests=0 disables its internal Throttler so we
  // never double-limit and pay latency twice on every request.
  const rateLimiter = new RateLimiter(config.WC_RATE_LIMIT_PER_SECOND);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ApiCtor = WooCommerceRestApi as any;
  const apiInstance = new ApiCtor({
    url: config.WC_URL,
    consumerKey: config.WC_KEY,
    consumerSecret: config.WC_SECRET,
    version: config.WC_VERSION,
    queryStringAuth: config.WC_QUERY_STRING_AUTH,
    maxConcurrentRequests: 0,
  }) as WooApi;

  /**
   * WooCommerce REST rejects empty/undefined enum query params with HTTP 400
   * ("order is not one of asc and desc", etc.). Strip nullish values before send.
   */
  const cleanParams = (
    params?: Record<string, unknown>,
  ): Record<string, unknown> | undefined => {
    if (!params) return undefined;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      out[k] = v;
    }
    return Object.keys(out).length ? out : undefined;
  };

  const client: WooClient = {
    api: apiInstance,
    rateLimiter,
    config,
    get: (endpoint, params) =>
      rateLimiter.schedule(() => apiInstance.get(endpoint, cleanParams(params))),
    post: (endpoint, data, params) =>
      rateLimiter.schedule(() =>
        apiInstance.post(endpoint, data, cleanParams(params)),
      ),
    put: (endpoint, data, params) =>
      rateLimiter.schedule(() =>
        apiInstance.put(endpoint, data, cleanParams(params)),
      ),
    delete: (endpoint, data, params) =>
      rateLimiter.schedule(() =>
        apiInstance.delete(
          endpoint,
          data ?? { force: true },
          cleanParams(params as Record<string, unknown>) as
            | { id?: number }
            | undefined,
        ),
      ),
    pagination(response, page, perPage) {
      const info = parsePaginationHeaders(response);
      return {
        total: info.total,
        totalPages: info.totalPages,
        currentPage: page,
        perPage,
      };
    },
  };

  return client;
}
