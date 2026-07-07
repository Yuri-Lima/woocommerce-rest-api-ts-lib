import WooCommerceRestApi from "../index";

describe("_parseParamsObject cleanup", () => {
    test("dead commented _parseParamsObject is not a client method", () => {
        const api = new WooCommerceRestApi({
            url: "https://example.com",
            consumerKey: "ck_test",
            consumerSecret: "cs_test",
        });
        expect((api as unknown as { _parseParamsObject?: unknown })._parseParamsObject).toBeUndefined();
    });
});
