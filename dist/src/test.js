"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./index"));
const nock_1 = __importDefault(require("nock"));
describe("#options", () => {
    test("wpAPIPrefix should set WP REST API custom path", () => {
        const api = new index_1.default({
            url: "https://test.dev",
            consumerKey: "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            consumerSecret: "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            wpAPIPrefix: "wp-rest",
            version: "wc/v3",
            queryStringAuth: false
        });
        const endpoint = "products";
        const expected = "https://test.dev/wp-rest/wc/v3/" + endpoint;
        const url = api._getUrl(endpoint, {});
        expect(url).toBe(expected);
    });
});
describe("#methods", () => {
    const api = new index_1.default({
        url: "https://test.dev",
        consumerKey: "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        consumerSecret: "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        version: "wc/v3",
        queryStringAuth: false
    });
    test("_getUrl should return full endpoint URL", () => {
        const endpoint = "products";
        const expected = "https://test.dev/wp-json/wc/v3/" + endpoint;
        const url = api._getUrl(endpoint, {});
        expect(url).toBe(expected);
    });
    test("_normalizeQueryString should return query string sorted by name", () => {
        const url = "http://test.dev/wp-json/wc/v3/products?filter[q]=Woo+Album&fields=id&filter[limit]=1";
        const expected = "http://test.dev/wp-json/wc/v3/products?fields=id&filter[limit]=1&filter[q]=Woo%20Album";
        const normalized = api._normalizeQueryString(url, {});
        expect(normalized).toBe(expected);
    });
});
describe("#requests", () => {
    beforeEach(() => {
        nock_1.default.cleanAll();
    });
    const api = new index_1.default({
        url: "https://test.dev",
        consumerKey: "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        consumerSecret: "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        version: "wc/v3",
        queryStringAuth: false
    });
    test("should return content for basic auth", () => {
        expect.assertions(1);
        (0, nock_1.default)(`https://test.dev/wp-json/wc/v3`)
            .post("/orders", {})
            .reply(201, {
            ok: true
        });
        return api.post("orders", {}).then(response => {
            expect(response.status).toBe(201);
        });
    });
    test("should return content for get requests", () => {
        expect.assertions(1);
        (0, nock_1.default)("https://test.dev/wp-json/wc/v3")
            .get("/orders")
            .reply(200, {
            ok: true
        });
        return api.get("orders", {}).then(response => {
            expect(response.status).toBe(200);
        });
    });
    test("should return content for put requests", () => {
        expect.assertions(1);
        (0, nock_1.default)("https://test.dev/wp-json/wc/v3")
            .put("/orders")
            .reply(200, {
            ok: true
        });
        return api.put("orders", {}).then(response => {
            expect(response.status).toBe(200);
        });
    });
    test("should return content for delete requests", () => {
        expect.assertions(1);
        (0, nock_1.default)("https://test.dev/wp-json/wc/v3")
            .delete("/orders")
            .reply(200, {
            ok: true
        });
        return api.delete("orders", {}).then(response => {
            expect(response.status).toBe(200);
        });
    });
    test("should return content for options requests", () => {
        expect.assertions(1);
        (0, nock_1.default)("https://test.dev/wp-json/wc/v3")
            .intercept("/orders", "OPTIONS")
            .reply(200, {
            ok: true
        });
        return api.options("orders", {}).then(response => {
            expect(response.status).toBe(200);
        });
    });
    test("should return content for OAuth", () => {
        expect.assertions(1);
        const oAuth = new index_1.default({
            url: "http://test.dev",
            consumerKey: "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            consumerSecret: "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            version: "wc/v3",
            queryStringAuth: false
        });
        (0, nock_1.default)("http://test.dev/wp-json/wc/v3")
            .filteringPath(/\?.*/, "?params")
            .get("/orders?params")
            .reply(200, {
            ok: true
        });
        return oAuth.get("orders", {}).then(response => {
            expect(response.status).toBe(200);
        });
    });
});
