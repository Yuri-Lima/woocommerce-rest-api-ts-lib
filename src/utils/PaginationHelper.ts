/**
 * PaginationHelper.
 * Small reusable utility for the common WooCommerce WP REST pagination pattern
 * (x-wp-total, x-wp-totalpages headers + manual page/per_page loops).
 * The library itself stays "thin client" (no auto-paging magic that hides rate limits),
 * but this helper makes correct pagination easy and type-safe for callers.
 */

import type { WooCommerceApiResponse } from "../types/index.js";

export interface PaginationInfo {
    total: number;
    totalPages: number;
    currentPage?: number;
    perPage?: number;
}

export function parsePaginationHeaders<T>(response: WooCommerceApiResponse<T>): PaginationInfo {
    const h = response.headers || {};
    const total = Number(h["x-wp-total"] ?? h["X-WP-Total"] ?? 0) || 0;
    const totalPages = Number(h["x-wp-totalpages"] ?? h["X-WP-TotalPages"] ?? 1) || 1;
    return { total, totalPages };
}

/**
 * Example helper to collect all pages for a list endpoint using the provided fetcher.
 * Stops early if a page returns fewer items than perPage (or on empty).
 * Respects caller-provided per_page (default 10).
 *
 * Usage:
 *   const all = await collectAllPages((p) => api.get<Products[]>("products", { per_page: 50, page: p }));
 */
export async function collectAllPages<T>(
    fetchPage: (page: number, perPage: number) => Promise<WooCommerceApiResponse<T[]>>,
    options?: { perPage?: number; maxPages?: number },
): Promise<T[]> {
    const perPage = options?.perPage ?? 10;
    const maxPages = options?.maxPages ?? Infinity;
    const results: T[] = [];
    let page = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (page > maxPages) break;
        const res = await fetchPage(page, perPage);
        const items = Array.isArray(res.data) ? res.data : [];
        results.push(...items);
        const info = parsePaginationHeaders(res);
        if (items.length < perPage || page >= info.totalPages) {
            break;
        }
        page += 1;
    }
    return results;
}
