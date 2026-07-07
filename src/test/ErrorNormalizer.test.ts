/**
 * ErrorNormalizer unit tests — axios error shapes → WooCommerceApiError.
 * Uses synthetic axios-like errors (no live network).
 */
import { normalizeAxiosError } from "../http/ErrorNormalizer";
import { WooCommerceApiError } from "../types";

describe("ErrorNormalizer", () => {
    const ctx = { endpoint: "products" };

    test("maps response errors to WooCommerceApiError with status and body", () => {
        const err = {
            message: "Request failed",
            response: {
                status: 404,
                data: { message: "Product not found", code: "woocommerce_rest_product_invalid_id" },
            },
        };
        const normalized = normalizeAxiosError(err, ctx);
        expect(normalized).toBeInstanceOf(WooCommerceApiError);
        expect(normalized.message).toBe("Product not found");
        expect(normalized.statusCode).toBe(404);
        expect(normalized.endpoint).toBe("products");
        expect(normalized.response).toEqual(err.response.data);
    });

    test("falls back to err.message when response body has no message", () => {
        const err = {
            message: "Bad Gateway",
            response: { status: 502, data: { code: "upstream" } },
        };
        const normalized = normalizeAxiosError(err, ctx);
        expect(normalized.message).toBe("Bad Gateway");
        expect(normalized.statusCode).toBe(502);
    });

    test("maps network errors (request present, no response) to status 0", () => {
        const err = {
            message: "socket hang up",
            request: { path: "/wp-json/wc/v3/products" },
        };
        const normalized = normalizeAxiosError(err, ctx);
        expect(normalized.message).toMatch(/Network error/i);
        expect(normalized.statusCode).toBe(0);
        expect(normalized.response).toBeNull();
        expect(normalized.endpoint).toBe("products");
    });

    test("maps setup/config errors (no request, no response)", () => {
        const err = { message: "Invalid URL" };
        const normalized = normalizeAxiosError(err, { endpoint: "orders" });
        expect(normalized.message).toMatch(/Request setup error: Invalid URL/);
        expect(normalized.statusCode).toBe(0);
        expect(normalized.endpoint).toBe("orders");
    });

    test("handles completely empty error objects", () => {
        const normalized = normalizeAxiosError({}, { endpoint: "coupons" });
        expect(normalized).toBeInstanceOf(WooCommerceApiError);
        expect(normalized.message).toMatch(/Request setup error/);
        expect(normalized.endpoint).toBe("coupons");
    });
});
