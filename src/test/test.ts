"use strict";

import WooCommerceRestApi from "../index";
import nock from "nock";

const secretKey = "ck_";
const consumerKey = "cs_";

describe("#options", () => {
    test("wpAPIPrefix should set WP REST API custom path", () => {
        const api = new WooCommerceRestApi({
            url: "https://test.dev",
            consumerKey: secretKey,
            consumerSecret: consumerKey,
            wpAPIPrefix: "wp-rest",
            version: "wc/v3",
            queryStringAuth: false, // Force Basic Authentication as query string true and using under HTTPS
        });

        const endpoint = "products";
        const expected = "https://test.dev/wp-rest/wc/v3/" + endpoint;
        const url = api._getUrl(endpoint, {});
        expect(url).toBe(expected);
    });
});

describe("#methods", () => {
    const api = new WooCommerceRestApi({
        url: "https://test.dev",
        consumerKey: "secretKey",
        consumerSecret: consumerKey,
        version: "wc/v3",
        queryStringAuth: false, // Force Basic Authentication as query string true and using under HTTPS
    });

    test("_getUrl should return full endpoint URL", () => { // Fix #1 This is the same test as the one above
        const endpoint = "products";
        const expected = "https://test.dev/wp-json/wc/v3/" + endpoint;
        const url = api._getUrl(endpoint, {});

        expect(url).toBe(expected);
    });

    test("_normalizeQueryString should return query string sorted by name", () => {
        const url =
      "http://test.dev/wp-json/wc/v3/products?filter[q]=Woo+Album&fields=id&filter[limit]=1";
        const expected =
      "http://test.dev/wp-json/wc/v3/products?fields=id&filter[limit]=1&filter[q]=Woo%20Album";
        const normalized = api._normalizeQueryString(url, {});

        expect(normalized).toBe(expected);
    });
});

describe("#requests", () => {
    beforeEach(() => {
        nock.cleanAll(); // clean all nock mocks
    });

    const api = new WooCommerceRestApi({
        url: "https://test.dev",
        consumerKey: "secretKey",
        consumerSecret: consumerKey,
        version: "wc/v3",
        queryStringAuth: false, // Force Basic Authentication as query string true and using under HTTPS
    });

    test("should return content for basic auth", () => {
        expect.assertions(1);

        nock(`https://test.dev/wp-json/wc/v3`).post("/orders", {}).reply(201, {
            ok: true,
        });

        return api.post("coupons", {}, {}).then((response: any) => {
            expect(response.status).toBe(201);
        });
    });

    test("should return content for get requests", () => {
        expect.assertions(1);
        nock("https://test.dev/wp-json/wc/v3").get("/orders").reply(200, {
            ok: true,
        });

        return api.get("orders").then((response: any) => {
            expect(response.status).toBe(200);
        });
    });

    test("should return content for put requests", () => {
        expect.assertions(1);
        nock("https://test.dev/wp-json/wc/v3").put("/orders").reply(200, {
            ok: true,
        });

        return api.put("orders", {}).then((response: any) => {
            expect(response.status).toBe(200);
        });
    });

    test("should return content for delete requests", () => {
        expect.assertions(1);
        nock("https://test.dev/wp-json/wc/v3").delete("/orders").reply(200, {
            ok: true,
        });

        return api.delete("orders", {}).then((response: any) => {
            expect(response.status).toBe(200);
        });
    });

    test("should return content for options requests", () => {
        expect.assertions(1);
        nock("https://test.dev/wp-json/wc/v3")
            .intercept("/orders", "OPTIONS")
            .reply(200, {
                ok: true,
            });

        return api.options("orders", {}).then((response: any) => {
            expect(response.status).toBe(200);
        });
    });

    test("should return content for OAuth", () => {
        expect.assertions(1);
        const oAuth = new WooCommerceRestApi({
            url: "http://test.dev",
            consumerKey: "secretKey",
            consumerSecret: consumerKey,
            version: "wc/v3",
            queryStringAuth: false, // Force Basic Authentication as query string true and using under HTTPS
        });

        nock("http://test.dev/wp-json/wc/v3")
            .filteringPath(/\?.*/, "?params")
            .get("/orders?params")
            .reply(200, {
                ok: true,
            });

        return oAuth.get("orders", {}).then((response: any) => {
            expect(response.status).toBe(200);
        });
    });
});
