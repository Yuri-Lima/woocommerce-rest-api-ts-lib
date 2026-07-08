/**
 * Store API HTTP transport — no OAuth / no consumer keys.
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type Method,
} from "axios";
import {
  isSessionRelatedCode,
  StoreApiError,
  StoreApiOptionsError,
} from "./errors.js";
import type { CartSession } from "./session.js";
import type { StoreApiResponse } from "./types.js";
import {
  createThrottler,
  sanitizeApiVersion,
  sanitizeEndpoint,
  type Throttler,
  validateBaseUrl,
} from "./utils.js";

export interface StoreHttpOptions {
  url: string;
  wpAPIPrefix?: string;
  version?: string;
  timeoutMs?: number;
  maxConcurrentRequests?: number;
  /** Injected axios instance (tests). */
  axiosInstance?: AxiosInstance;
}

function normalizeAxiosHeaders(
  headers: AxiosResponse["headers"],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers || typeof headers !== "object") return out;
  // Axios v1 headers may be AxiosHeaders with toJSON
  const raw =
    typeof (headers as { toJSON?: () => Record<string, unknown> }).toJSON ===
    "function"
      ? (headers as { toJSON: () => Record<string, unknown> }).toJSON()
      : (headers as Record<string, unknown>);
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue;
    out[k] = Array.isArray(v) ? String(v[0]) : String(v);
  }
  return out;
}

export class StoreHttpClient {
  private readonly baseUrl: string;
  private readonly wpAPIPrefix: string;
  private readonly version: string;
  private readonly timeoutMs: number;
  private readonly axios: AxiosInstance;
  private readonly throttler: Throttler;
  private readonly session: CartSession;

  constructor(options: StoreHttpOptions, session: CartSession) {
    const parsed = validateBaseUrl(options.url);
    // origin only (pathname on store URL is rare; strip trailing slash)
    this.baseUrl = `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
    const prefix = (options.wpAPIPrefix || "wp-json").replace(/^\/+|\/+$/g, "");
    // wp-json is a single path segment
    this.wpAPIPrefix = sanitizeEndpoint(prefix || "wp-json");
    // version is multi-segment (wc/store/v1) — use dedicated sanitizer
    this.version = sanitizeApiVersion(options.version || "wc/store/v1");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.throttler = createThrottler(options.maxConcurrentRequests);
    this.session = session;
    this.axios =
      options.axiosInstance ??
      axios.create({
        timeout: this.timeoutMs,
        validateStatus: () => true,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
  }

  getSession(): CartSession {
    return this.session;
  }

  buildUrl(endpoint: string, query?: Record<string, unknown>): string {
    const safe = sanitizeEndpoint(endpoint);
    const base = this.baseUrl.endsWith("/")
      ? this.baseUrl
      : `${this.baseUrl}/`;
    let url = `${base}${this.wpAPIPrefix}/${this.version}/${safe}`;
    if (query && Object.keys(query).length) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(
              Array.isArray(v) ? v.join(",") : String(v),
            )}`,
        )
        .join("&");
      if (qs) url = `${url}?${qs}`;
    }
    return url;
  }

  async request<T>(
    method: Method,
    endpoint: string,
    options: {
      query?: Record<string, unknown>;
      body?: unknown;
      /** Skip session headers (rare). */
      skipSessionHeaders?: boolean;
      /** Extra headers */
      headers?: Record<string, string>;
    } = {},
  ): Promise<StoreApiResponse<T>> {
    if (!method) {
      throw new StoreApiOptionsError("method is required");
    }

    await this.throttler.acquire();
    try {
      const url = this.buildUrl(endpoint, options.query);
      const sessionHeaders = options.skipSessionHeaders
        ? {}
        : await this.session.getRequestHeaders();

      const config: AxiosRequestConfig = {
        method,
        url,
        data: options.body,
        headers: {
          ...sessionHeaders,
          ...options.headers,
        },
        timeout: this.timeoutMs,
        validateStatus: () => true,
      };

      const res = await this.axios.request(config);
      const headers = normalizeAxiosHeaders(res.headers);
      await this.session.absorbResponseHeaders(headers);

      if (res.status >= 400) {
        throw this.toError(res);
      }

      return {
        data: res.data as T,
        status: res.status,
        headers,
      };
    } catch (err) {
      if (err instanceof StoreApiError || err instanceof StoreApiOptionsError) {
        throw err;
      }
      // Network / axios thrown errors
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as
          | { message?: string; code?: string }
          | undefined;
        throw new StoreApiError(
          data?.message || err.message || "Store API request failed",
          {
            status,
            code: data?.code || err.code,
            data: err.response?.data,
            isSessionError: isSessionRelatedCode(data?.code, status),
          },
        );
      }
      throw err;
    } finally {
      this.throttler.release();
    }
  }

  private toError(res: AxiosResponse): StoreApiError {
    const data = res.data as
      | { message?: string; code?: string; data?: unknown }
      | string
      | undefined;
    let message = `Store API HTTP ${res.status}`;
    let code: string | undefined;
    let payload: unknown = data;
    if (data && typeof data === "object") {
      message = data.message || message;
      code = data.code;
      payload = data;
    } else if (typeof data === "string" && data) {
      message = data;
    }
    return new StoreApiError(message, {
      status: res.status,
      code,
      data: payload,
      isSessionError: isSessionRelatedCode(code, res.status),
    });
  }
}
