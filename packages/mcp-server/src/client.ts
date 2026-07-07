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
 * Rate limiter: enforces a maximum number of operations per second
 * using a sliding window + the Throttler concurrency gate.
 */
export class RateLimiter {
  private readonly intervalMs: number;
  private readonly throttler: Throttler;
  private lastRequestAt = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(requestsPerSecond: number, maxConcurrent?: number) {
    this.intervalMs = Math.ceil(1000 / Math.max(1, requestsPerSecond));
    // Align concurrent slots with rate limit (library Throttler pattern)
    this.throttler = new ConcurrencyThrottler(
      maxConcurrent ?? Math.max(1, requestsPerSecond),
    );
  }

  /**
   * Schedule `fn` to run respecting both rate and concurrency limits.
   */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    // Serialize start times so we never exceed N starts per second
    const run = this.chain.then(async () => {
      const now = Date.now();
      const wait = Math.max(0, this.lastRequestAt + this.intervalMs - now);
      if (wait > 0) {
        await new Promise((r) => setTimeout(r, wait));
      }
      this.lastRequestAt = Date.now();
    });
    // Keep chain alive even if a prior task rejects
    this.chain = run.catch(() => undefined);
    await run;

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
  const rateLimiter = new RateLimiter(config.WC_RATE_LIMIT_PER_SECOND);

  // Library's internal Throttler is engaged via maxConcurrentRequests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ApiCtor = WooCommerceRestApi as any;
  const apiInstance = new ApiCtor({
    url: config.WC_URL,
    consumerKey: config.WC_KEY,
    consumerSecret: config.WC_SECRET,
    version: config.WC_VERSION,
    queryStringAuth: config.WC_QUERY_STRING_AUTH,
    maxConcurrentRequests: config.WC_RATE_LIMIT_PER_SECOND,
  }) as WooApi;

  const client: WooClient = {
    api: apiInstance,
    rateLimiter,
    config,
    get: (endpoint, params) =>
      rateLimiter.schedule(() => apiInstance.get(endpoint, params)),
    post: (endpoint, data, params) =>
      rateLimiter.schedule(() => apiInstance.post(endpoint, data, params)),
    put: (endpoint, data, params) =>
      rateLimiter.schedule(() => apiInstance.put(endpoint, data, params)),
    delete: (endpoint, data, params) =>
      rateLimiter.schedule(() =>
        apiInstance.delete(endpoint, data ?? { force: true }, params ?? {}),
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
