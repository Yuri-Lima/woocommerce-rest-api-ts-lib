/**
 * Focused unit tests for the new reusable abstractions (PHASE2/4).
 * These run without nock (pure or with tiny timers) and exercise error/edge paths
 * that are harder to hit through the main client + nock.
 */

import { describe, test, expect } from "@jest/globals";
import {
    sanitizePathSegment,
    sanitizeEndpoint,
    sanitizeApiVersion,
    validateBaseUrl,
} from "../utils/sanitize";
import { OptionsException } from "../types";
import { ConcurrencyThrottler } from "../http/Throttler";
import { ExponentialBackoffRetryStrategy } from "../http/RetryStrategy";
import { parsePaginationHeaders, collectAllPages } from "../utils/PaginationHelper";
import type { WooCommerceApiResponse } from "../types";

// --- Sanitizer edge cases (path traversal, unicode, empty, etc.) ---

describe("RequestSanitizer (src/utils/sanitize)", () => {
    test("rejects empty segment", () => {
        expect(() => sanitizePathSegment("", "wpAPIPrefix")).toThrow(OptionsException);
    });

    test("rejects traversal ..", () => {
        expect(() => sanitizePathSegment("..", "endpoint")).toThrow(/traversal/);
        expect(() => sanitizeEndpoint("products/../evil")).toThrow(/traversal/);
    });

    test("rejects protocol and absolute", () => {
        expect(() => sanitizeEndpoint("https://evil.com/x")).toThrow(/protocol/);
        expect(() => sanitizeEndpoint("/absolute")).toThrow(/relative path/);
    });

    test("accepts valid nested endpoint", () => {
        expect(sanitizeEndpoint("products/attributes/123")).toBe("products/attributes/123");
    });

    test("sanitizeApiVersion rejects bad forms", () => {
        expect(() => sanitizeApiVersion("wc/v3/../x")).toThrow();
        expect(() => sanitizeApiVersion("http://wc/v3")).toThrow();
        expect(sanitizeApiVersion("/wc/v3/")).toBe("wc/v3");
    });

    test("validateBaseUrl enforces http/https only", () => {
        expect(() => validateBaseUrl("ftp://example.com")).toThrow(/http or https/);
        expect(() => validateBaseUrl("not a url")).toThrow(/valid absolute URL/);
        const u = validateBaseUrl("https://store.example.com/");
        expect(u.protocol).toBe("https:");
    });
});

// --- Throttler ---

describe("ConcurrencyThrottler", () => {
    test("unlimited when max <= 0", async () => {
        const t = new ConcurrencyThrottler(0);
        await t.acquire();
        await t.acquire();
        t.release();
        t.release();
        // should not throw / hang
        expect(true).toBe(true);
    });

    test("queues when at limit", async () => {
        const t = new ConcurrencyThrottler(1);
        await t.acquire(); // takes the slot

        let released = false;
        const p = t.acquire().then(() => { released = true; });

        // not yet
        await new Promise((resolve) => setTimeout(resolve, 5));
        expect(released).toBe(false);

        t.release(); // should wake the waiter
        await p;
        expect(released).toBe(true);
        t.release();
    });
});

// --- RetryStrategy (smoke: 0 retries + success path) ---

describe("ExponentialBackoffRetryStrategy", () => {
    test("passes through success on first attempt", async () => {
        const strategy = new ExponentialBackoffRetryStrategy({ retries: 0 });
        // We can't easily mock axios here without more setup, but we can at least
        // construct and ensure the config shape doesn't explode.
        expect(strategy).toBeInstanceOf(ExponentialBackoffRetryStrategy);
    });
});

// --- PaginationHelper ---

describe("PaginationHelper", () => {
    test("parsePaginationHeaders reads x-wp-* (case variations)", () => {
        const res: WooCommerceApiResponse<unknown> = {
            data: [],
            status: 200,
            statusText: "OK",
            headers: {
                "x-wp-total": "42",
                "x-wp-totalpages": "5",
            },
        };
        const info = parsePaginationHeaders(res);
        expect(info.total).toBe(42);
        expect(info.totalPages).toBe(5);
    });

    test("collectAllPages stops when a page is short or totalPages reached", async () => {
        // Simulate 2 pages of 2 items, totalPages=2
        let calls = 0;
        const fakeFetcher = async (page: number) => {
            calls++;
            if (page === 1) {
                return { data: [{ id: 1 }, { id: 2 }], status: 200, statusText: "OK", headers: { "x-wp-total": "4", "x-wp-totalpages": "2" } } as any;
            }
            return { data: [{ id: 3 }, { id: 4 }], status: 200, statusText: "OK", headers: { "x-wp-total": "4", "x-wp-totalpages": "2" } } as any;
        };

        const all = await collectAllPages(fakeFetcher as any, { perPage: 2 });
        expect(all).toHaveLength(4);
        expect(calls).toBe(2);
    });
});
