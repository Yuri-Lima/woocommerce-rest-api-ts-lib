import WooCommerceRestApi from "../index";

describe("classVersion", () => {
    test("defaults to package version 8.0.0 not stale 0.0.2", () => {
        const api = new WooCommerceRestApi({
            url: "https://example.com",
            consumerKey: "ck_test",
            consumerSecret: "cs_test",
        });
        const version = (api as unknown as { _opt: { classVersion: string } })._opt.classVersion;
        expect(version).toBe("8.0.0");
        expect(version).not.toBe("0.0.2");
    });
});
