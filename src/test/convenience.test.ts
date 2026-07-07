/**
 * Convenience methods — hermetic nock mocks (same auth style as wc.test.ts).
 */
import nock from "nock";
import WooCommerceRestApi from "../index";

const BASE = "https://example.com";

function makeApi() {
    return new WooCommerceRestApi({
        url: BASE,
        consumerKey: "ck_test_consumer_key_for_hermetic_nock",
        consumerSecret: "cs_test_consumer_secret_for_hermetic_nock",
        version: "wc/v3",
        queryStringAuth: false,
    });
}

function mockCommon() {
    const headers = {
        "content-type": "application/json",
        "x-wp-total": "1",
        "x-wp-totalpages": "1",
    };
    nock(BASE)
        .persist()
        .get(/\/wp-json\/wc\/v3\/products\/\d+/)
        .reply(200, { id: 11, name: "Shoe" }, headers)
        .get(/\/wp-json\/wc\/v3\/products/)
        .reply(200, [{ id: 1, name: "Hat" }], headers)
        .post(/\/wp-json\/wc\/v3\/products/)
        .reply(201, { id: 99, name: "New" }, headers)
        .put(/\/wp-json\/wc\/v3\/products/)
        .reply(200, { id: 5, name: "Updated" }, headers)
        .get(/\/wp-json\/wc\/v3\/orders\/\d+/)
        .reply(200, { id: 3, status: "processing" }, headers)
        .get(/\/wp-json\/wc\/v3\/orders/)
        .reply(200, [{ id: 3, status: "processing" }], headers)
        .post(/\/wp-json\/wc\/v3\/orders/)
        .reply(201, { id: 77, status: "pending" }, headers)
        .get(/\/wp-json\/wc\/v3\/customers\/\d+/)
        .reply(200, { id: 8, email: "a@b.c" }, headers)
        .get(/\/wp-json\/wc\/v3\/customers/)
        .reply(200, [{ id: 8, email: "a@b.c" }], headers)
        .get(/\/wp-json\/wc\/v3\/coupons/)
        .reply(200, [{ id: 2, code: "SAVE" }], headers)
        .get(/\/wp-json\/wc\/v3\/system_status/)
        .reply(200, { environment: { wp_version: "6.4" } }, headers);
}

describe("convenience methods", () => {
    beforeAll(() => {
        nock.cleanAll();
        nock.disableNetConnect();
        mockCommon();
    });

    afterAll(() => {
        nock.cleanAll();
    });

    test("getProducts hits products collection", async () => {
        const res = await makeApi().getProducts({ per_page: 1 });
        expect(res.status).toBe(200);
        expect(res.data[0]).toMatchObject({ id: 1, name: "Hat" });
    });

    test("getProduct hits products/{id}", async () => {
        const res = await makeApi().getProduct(11);
        expect(res.data).toMatchObject({ id: 11 });
    });

    test("createProduct posts product payload", async () => {
        const res = await makeApi().createProduct({ name: "New" });
        expect(res.status).toBe(201);
        expect(res.data).toMatchObject({ id: 99, name: "New" });
    });

    test("updateProduct puts product payload with id param", async () => {
        const res = await makeApi().updateProduct(5, { name: "Updated" });
        expect(res.data).toMatchObject({ id: 5, name: "Updated" });
    });

    test("getOrders and getOrder", async () => {
        const list = await makeApi().getOrders();
        expect(Array.isArray(list.data)).toBe(true);
        const one = await makeApi().getOrder(3);
        expect(one.data).toMatchObject({ id: 3 });
    });

    test("createOrder posts order payload", async () => {
        const res = await makeApi().createOrder({ status: "pending" });
        expect(res.data).toMatchObject({ id: 77 });
    });

    test("getCustomers and getCustomer", async () => {
        const list = await makeApi().getCustomers();
        expect(list.data[0]).toMatchObject({ id: 8 });
        const one = await makeApi().getCustomer(8);
        expect(one.data).toMatchObject({ email: "a@b.c" });
    });

    test("getCoupons and getSystemStatus", async () => {
        const coupons = await makeApi().getCoupons();
        expect(coupons.data[0]).toMatchObject({ code: "SAVE" });
        const status = await makeApi().getSystemStatus();
        expect(status.data).toMatchObject({ environment: { wp_version: "6.4" } });
    });
});
