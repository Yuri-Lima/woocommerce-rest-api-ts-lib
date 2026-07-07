/**
 * PaginationHelper tests — WP REST pagination headers + multi-page collection.
 */
import nock from "nock";
import { parsePaginationHeaders, collectAllPages } from "../utils/PaginationHelper";
import type { WooCommerceApiResponse } from "../types";
import WooCommerceRestApi from "../index";

describe("PaginationHelper", () => {
    test("parsePaginationHeaders reads lowercase x-wp-total headers", () => {
        const res: WooCommerceApiResponse<unknown[]> = {
            data: [],
            status: 200,
            statusText: "OK",
            headers: { "x-wp-total": "100", "x-wp-totalpages": "10" },
        };
        expect(parsePaginationHeaders(res)).toEqual({ total: 100, totalPages: 10 });
    });

    test("parsePaginationHeaders reads Pascal-Case header variants", () => {
        const res: WooCommerceApiResponse<unknown[]> = {
            data: [],
            status: 200,
            statusText: "OK",
            headers: { "X-WP-Total": "3", "X-WP-TotalPages": "2" },
        };
        expect(parsePaginationHeaders(res)).toEqual({ total: 3, totalPages: 2 });
    });

    test("parsePaginationHeaders defaults when headers missing", () => {
        const res: WooCommerceApiResponse<unknown[]> = {
            data: [],
            status: 200,
            statusText: "OK",
            headers: {},
        };
        expect(parsePaginationHeaders(res)).toEqual({ total: 0, totalPages: 1 });
    });

    test("collectAllPages aggregates pages until totalPages", async () => {
        let calls = 0;
        const fetchPage = async (page: number, perPage: number) => {
            calls += 1;
            const items = Array.from({ length: perPage }, (_, i) => ({
                id: (page - 1) * perPage + i + 1,
            }));
            return {
                data: items,
                status: 200,
                statusText: "OK",
                headers: { "x-wp-total": "4", "x-wp-totalpages": "2" },
            } as WooCommerceApiResponse<{ id: number }[]>;
        };
        const all = await collectAllPages(fetchPage, { perPage: 2 });
        expect(all.map((x) => x.id)).toEqual([1, 2, 3, 4]);
        expect(calls).toBe(2);
    });

    test("collectAllPages stops early on short page", async () => {
        let calls = 0;
        const fetchPage = async (page: number) => {
            calls += 1;
            if (page === 1) {
                return {
                    data: [{ id: 1 }, { id: 2 }],
                    status: 200,
                    statusText: "OK",
                    headers: { "x-wp-total": "99", "x-wp-totalpages": "50" },
                } as WooCommerceApiResponse<{ id: number }[]>;
            }
            return {
                data: [{ id: 3 }],
                status: 200,
                statusText: "OK",
                headers: { "x-wp-total": "99", "x-wp-totalpages": "50" },
            } as WooCommerceApiResponse<{ id: number }[]>;
        };
        const all = await collectAllPages(fetchPage, { perPage: 2 });
        expect(all).toHaveLength(3);
        expect(calls).toBe(2);
    });

    test("collectAllPages respects maxPages", async () => {
        let calls = 0;
        const fetchPage = async (page: number) => {
            calls += 1;
            return {
                data: [{ id: page }],
                status: 200,
                statusText: "OK",
                headers: { "x-wp-total": "100", "x-wp-totalpages": "100" },
            } as WooCommerceApiResponse<{ id: number }[]>;
        };
        const all = await collectAllPages(fetchPage, { perPage: 1, maxPages: 3 });
        expect(all).toHaveLength(3);
        expect(calls).toBe(3);
    });

    test("collectAllPages works with nock-backed Woo client fetcher", async () => {
        const base = "https://example.com";
        nock.cleanAll();
        nock.disableNetConnect();
        let call = 0;
        nock(base)
            .persist()
            .get(/\/wp-json\/wc\/v3\/products/)
            .reply(
                200,
                () => {
                    call += 1;
                    if (call === 1) return [{ id: 1 }, { id: 2 }];
                    return [{ id: 3 }, { id: 4 }];
                },
                {
                    "x-wp-total": "4",
                    "x-wp-totalpages": "2",
                    "content-type": "application/json",
                },
            );

        const api = new WooCommerceRestApi({
            url: base,
            consumerKey: "ck_test_consumer_key_for_hermetic_nock",
            consumerSecret: "cs_test_consumer_secret_for_hermetic_nock",
            version: "wc/v3",
            queryStringAuth: false,
        });

        const all = await collectAllPages(
            (page, perPage) =>
                api.get<{ id: number }[]>("products", { page, per_page: perPage }),
            { perPage: 2 },
        );
        expect(all.map((p) => p.id)).toEqual([1, 2, 3, 4]);
        expect(call).toBe(2);
        nock.cleanAll();
    });
});
