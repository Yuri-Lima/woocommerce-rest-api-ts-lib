/**
 * RetryStrategy abstraction.
 * Allows pluggable retry policies (exponential, linear, none, circuit-breaker future, etc).
 * Default implementation: exponential backoff with jitter + special handling for 429 Retry-After.
 * Used by the internal HTTP execution path (and available for HttpClientBase extensions).
 */

import type { AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";

export interface RetryConfig {
    retries?: number;      // 0 = no retries
    retryDelay?: number;   // base delay ms
    retryOn?: number[];    // status codes to retry (in addition to network errors)
}

export interface RetryStrategy {
    /**
     * Execute the axios request with the strategy's retry policy.
     * Must throw the last error (or normalized) if all attempts exhausted.
     */
    executeWithRetry(options: AxiosRequestConfig): Promise<AxiosResponse>;
}

export class ExponentialBackoffRetryStrategy implements RetryStrategy {
    private readonly config: RetryConfig;
    constructor(cfg: RetryConfig = {}) {
        this.config = cfg;
    }

    async executeWithRetry(options: AxiosRequestConfig): Promise<AxiosResponse> {
        const maxRetries = this.config.retries ?? 0;
        const baseDelay = this.config.retryDelay ?? 1000;
        const retryableStatuses: number[] = this.config.retryOn ?? [408, 429, 500, 502, 503, 504];

        let lastError: unknown;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await axios(options);
            } catch (error: unknown) {
                lastError = error;

                // Narrowing without any
                const err = error as { response?: { status?: number; headers?: Record<string, unknown> }; code?: string; message?: string };
                const status: number | undefined = err.response?.status;
                const isNetworkError = !err.response || err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "ECONNABORTED";
                const isRetryableStatus = !status || retryableStatuses.includes(status);

                const shouldRetry = attempt < maxRetries && (isNetworkError || isRetryableStatus);

                if (!shouldRetry) {
                    throw error;
                }

                let delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);

                // Honor Retry-After on 429 (seconds or HTTP date)
                if (status === 429 && err.response?.headers) {
                    const retryAfterHeader = err.response.headers["retry-after"];
                    if (retryAfterHeader != null) {
                        const asSeconds = parseInt(String(retryAfterHeader), 10);
                        if (!Number.isNaN(asSeconds) && asSeconds > 0) {
                            delay = Math.max(delay, asSeconds * 1000);
                        } else {
                            const asDate = new Date(String(retryAfterHeader));
                            if (!Number.isNaN(asDate.getTime())) {
                                const delta = asDate.getTime() - Date.now();
                                if (delta > 0) delay = Math.max(delay, delta);
                            }
                        }
                    }
                }

                delay = Math.min(delay, 30000);
                await new Promise((resolve) => setTimeout(resolve, Math.floor(delay)));
            }
        }

        throw lastError;
    }
}

// Convenience factory for the options shape used by IWooRestApiOptions
export function createDefaultRetryStrategy(retryConfig?: RetryConfig): RetryStrategy {
    return new ExponentialBackoffRetryStrategy(retryConfig);
}
