"use strict";
const __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../index"));
const coupons_json_1 = __importDefault(require("./coupons.json"));
const productsJson_json_1 = __importDefault(require("./productsJson.json"));
const productsJson_response_json_1 = __importDefault(require("./productsJson-response.json"));
const ordersJson_json_1 = __importDefault(require("./ordersJson.json"));
const customersJson_json_1 = __importDefault(require("./customersJson.json"));
const example_data_orders_json_1 = __importDefault(require("./example_data_orders.json"));
const randomstring_1 = __importDefault(require("randomstring"));
const customersJson_response_json_1 = __importDefault(require("./customersJson-response.json"));
const luxon_1 = require("luxon");
const WOODateMinus = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const dateTime = luxon_1.DateTime.now();
    const newDate = dateTime
        .minus({
            years: data.years || 0,
            months: data.month || 0,
            days: data.days || 0,
            hours: data.hours || 0,
            minutes: data.minutes || 0,
        })
        .startOf("day")
        .setZone("America/Fortaleza");
    return newDate.toISO();
});
const WOODatePlus = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const dateTime = luxon_1.DateTime.now();
    const newDate = dateTime
        .plus({
            years: data.years || 0,
            months: data.month || 0,
            days: data.days || 0,
            hours: data.hours || 0,
            minutes: data.minutes || 0,
        })
        .startOf("day")
        .setZone("America/Fortaleza");
    return newDate.toISO();
});
const opt = {
    url: process.env.URL,
    consumerKey: process.env.CONSUMERKEY,
    consumerSecret: process.env.CONSUMERSECRET,
    version: "wc/v3",
    queryStringAuth: false,
};
const env = Object.assign({}, opt);
describe.only("#options/#methods", () => {
    let wooCommerce;
    beforeAll(() => {
        wooCommerce = new index_1.default({
            url: env.url,
            consumerKey: env.consumerKey,
            consumerSecret: env.consumerSecret,
            version: "wc/v3",
            queryStringAuth: false,
        });
    });
    test("instance should be an object", () => {
        expect(typeof wooCommerce).toBe(typeof {});
    });
    test("url is required", () => {
        expect(() => {
            const wooCommerceInstance = new index_1.default({
                url: "",
                consumerKey: env.consumerKey,
                consumerSecret: env.consumerSecret,
                version: "wc/v3",
                queryStringAuth: false,
            });
        }).toThrow("url is required");
    });
    test("consumerKey is required", () => {
        expect(() => {
            const wooCommerceInstance = new index_1.default({
                url: env.url,
                consumerKey: "",
                consumerSecret: env.consumerSecret,
                version: "wc/v3",
                queryStringAuth: false,
            });
        }).toThrow("consumerKey is required");
    });
    test("consumerSecret is required", () => {
        expect(() => {
            const wooCommerceInstance = new index_1.default({
                url: env.url,
                consumerKey: env.consumerSecret,
                consumerSecret: "",
                version: "wc/v3",
                queryStringAuth: false,
            });
        }).toThrow("consumerSecret is required");
    });
    test("wpAPIPrefix should set WP REST API custom path", () => {
        const endpoint = "products";
        const expected = env.url + "/wp-json/wc/v3/" + endpoint;
        const url = wooCommerce._getUrl(endpoint, {});
        expect(url).toBe(expected);
    });
    const endpoint = "products";
    test("_getUrl should return full endpoint URL", () => {
        const expected = env.url + "/wp-json/wc/v3/" + endpoint;
        const url = wooCommerce._getUrl(endpoint, {});
        expect(url).toBe(expected);
    });
    test("_normalizeQueryString should return query string sorted by name", () => {
        const url = env.url +
            "/wp-json/wc/v3/" +
            endpoint +
            "?filter[q]=Woo+Album&fields=id&filter[limit]=1";
        const expected = env.url +
            "/wp-json/wc/v3/" +
            endpoint +
            "?fields=id&filter[limit]=1&filter[q]=Woo%20Album";
        const normalized = wooCommerce._normalizeQueryString(url, {});
        expect(normalized).toBe(expected);
    });
});
describe.only("Test Coupons", () => {
    let wooCommerce;
    let each;
    let first_name;
    let middle_name;
    let last_name;
    let full_name;
    let discount;
    let best_before;
    beforeAll(() => {
        wooCommerce = new index_1.default({
            url: env.url,
            consumerKey: env.consumerKey,
            consumerSecret: env.consumerSecret,
            version: "wc/v3",
            queryStringAuth: false,
        });
    });
    beforeEach(() => {
        let _a, _b, _c, _d;
        jest.resetModules();
        each = example_data_orders_json_1.default[0];
        discount = "15";
        best_before = "2021-12-31T00:00:00";
        first_name = String((_a = each.billing) === null || _a === void 0 ? void 0 : _a.first_name).split(" ")[0];
        first_name =
            `${first_name.charAt(0).toLocaleUpperCase()}${first_name
                .slice(1)
                .toLocaleLowerCase()}` || " ";
        middle_name = String((_b = each.billing) === null || _b === void 0 ? void 0 : _b.first_name).split(" ")[1] || " ";
        middle_name =
            `${middle_name.charAt(0).toLocaleUpperCase()}${middle_name
                .slice(1)
                .toLocaleLowerCase()}` || " ";
        last_name =
            `${String((_c = each.billing) === null || _c === void 0 ? void 0 : _c.last_name).charAt(0).toLocaleUpperCase()}${String((_d = each.billing) === null || _d === void 0 ? void 0 : _d.last_name)
                .slice(1)
                .toLocaleLowerCase()}` || " ";
        full_name = `${first_name} ${middle_name} ${last_name}` || " ";
    });
    test("should return a list with all coupons created", () => __awaiter(void 0, void 0, void 0, function* () {
        const coupons = yield wooCommerce.get("coupons");
        expect(coupons).toBeInstanceOf(Object);
        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }
        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(coupons_json_1.default[0]);
            const keys = Object.keys(coupons.data[0]);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key, index) => {
                expect(keys[index]).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should return a list with all coupons created per page", () => __awaiter(void 0, void 0, void 0, function* () {
        const coupons = yield wooCommerce.get("coupons", { per_page: 3 });
        expect(coupons).toBeInstanceOf(Object);
        expect(coupons.data.length).toBe(3);
        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }
        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(coupons_json_1.default[0]);
            const keys = Object.keys(coupons.data[0]);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key, index) => {
                expect(keys[index]).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should create a Coupon", () => __awaiter(void 0, void 0, void 0, function* () {
        const total_products_price = Number(each.total) - Number(each.shipping_total);
        const total_products_price_with_discount = (total_products_price *
            (Number(discount) / 100)).toFixed(2);
        console.log(`Total: ${total_products_price} - Discount: ${discount} - Total with discount: ${total_products_price_with_discount}`);
        const coupom_data = {
            code: first_name.substring(0, 3).toLocaleUpperCase() +
                randomstring_1.default.generate({
                    length: 2,
                    capitalization: "uppercase",
                    charset: "numeric",
                }) +
                `-${each.id}`,
            discount_type: "fixed_cart",
            amount: total_products_price_with_discount,
            individual_use: true,
            exclude_sale_items: false,
            minimum_amount: "300",
            usage_limit: 1,
            usage_limit_per_user: 1,
            description: "Campanha de CashBack para clientes Test",
            date_expires: (yield WOODatePlus({ days: -3 })),
        };
        const coupons = yield wooCommerce.post("coupons", coupom_data);
        expect(coupons).toBeInstanceOf(Object);
        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }
        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(coupons_json_1.default[0]);
            const keys = Object.keys(coupons.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                    couponID: coupons.data.id,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key, index, array) => {
                expect(key).toEqual(expectedKeys[index]);
            });
        }
        console.log(coupons.data);
    }), 20000);
    test("should retrive a Coupon", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllCoupons = yield wooCommerce.get("coupons");
        if (getAllCoupons.headers["x-wp-totalpages"] > 1) {
            expect(getAllCoupons).toHaveProperty("data", expect.any(Array));
        }
        const coupons = yield wooCommerce.get("coupons", {
            code: getAllCoupons.data[0].id,
        });
        console.log(coupons.data.code);
        expect(coupons).toBeInstanceOf(Object);
        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }
        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(coupons_json_1.default[0]);
            const keys = Object.keys(coupons.data[0]);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key, index) => {
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should update a Coupon", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllCoupons = yield wooCommerce.get("coupons");
        if (getAllCoupons.headers["x-wp-totalpages"] > 1) {
            expect(getAllCoupons).toHaveProperty("data", expect.any(Array));
        }
        const coupons = yield wooCommerce.put("coupons", {
            description: "Campanha de CashBack para clientes Test - Updated - " +
                randomstring_1.default.generate({
                    length: 4,
                    capitalization: "uppercase",
                    charset: "alphanumeric",
                }),
        }, {
            id: getAllCoupons.data[0].id,
        });
        console.log(coupons.data);
        expect(coupons).toBeInstanceOf(Object);
        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }
        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(coupons_json_1.default[0]);
            const keys = Object.keys(coupons.data[0]);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key, index) => {
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should delete a Coupon", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllCoupons = yield wooCommerce.get("coupons");
        if (getAllCoupons.headers["x-wp-totalpages"] > 1) {
            expect(getAllCoupons).toHaveProperty("data", expect.any(Array));
        }
        const coupons = yield wooCommerce.delete("coupons", { force: true }, { id: getAllCoupons.data[0].id });
        console.log(coupons.data);
        expect(coupons).toBeInstanceOf(Object);
        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }
        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(coupons_json_1.default[0]);
            const keys = Object.keys(coupons.data[0]);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key, index) => {
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
});
describe.only("Test Products", () => {
    let wooCommerce;
    beforeAll(() => {
        wooCommerce = new index_1.default({
            url: env.url,
            consumerKey: env.consumerKey,
            consumerSecret: env.consumerSecret,
            version: "wc/v3",
            queryStringAuth: false,
        });
    });
    test("should return a list with all products created", () => __awaiter(void 0, void 0, void 0, function* () {
        const products = yield wooCommerce.get("products");
        expect(products).toBeInstanceOf(Object);
        if (products.headers["x-wp-totalpages"] > 1) {
            expect(products).toHaveProperty("data", expect.any(Array));
        }
        if (products.data.length > 0) {
            const expectedKeys = Object.keys(productsJson_json_1.default[0]);
            const keys = Object.keys(products.data[0]);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key, index) => {
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should create a new product", () => __awaiter(void 0, void 0, void 0, function* () {
        const data = {
            name: "Premium Quality",
            type: "simple",
            regular_price: "21.99",
            description: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.",
            short_description: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
            categories: [
                {
                    id: 9,
                },
                {
                    id: 14,
                },
            ],
            images: [
                {
                    src: "http://demo.woothemes.com/woocommerce/wp-content/uploads/sites/56/2013/06/T_2_front.jpg",
                },
                {
                    src: "http://demo.woothemes.com/woocommerce/wp-content/uploads/sites/56/2013/06/T_2_back.jpg",
                },
            ],
        };
        const products = yield wooCommerce.post("products", data);
        expect(products).toBeInstanceOf(Object);
        if (products.headers["x-wp-totalpages"] > 1) {
            expect(products).toHaveProperty("data", expect.any(Array));
        }
        if (products.data) {
            const expectedKeys = Object.keys(productsJson_response_json_1.default[0]);
            const keys = Object.keys(products.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 4)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should retrive a product", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllProducts = yield wooCommerce.get("products");
        if (getAllProducts.headers["x-wp-totalpages"] > 1) {
            expect(getAllProducts).toHaveProperty("data", expect.any(Array));
        }
        const products = yield wooCommerce.get("products", {
            id: getAllProducts.data[0].id,
        });
        expect(products).toBeInstanceOf(Object);
        if (products.headers["x-wp-totalpages"] > 1) {
            expect(products).toHaveProperty("data", expect.any(Array));
        }
        if (products.data.length > 0) {
            const expectedKeys = Object.keys(productsJson_json_1.default[0]);
            const keys = Object.keys(products.data[0]);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 4)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should update/edit a product", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllProducts = yield wooCommerce.get("products");
        if (getAllProducts.headers["x-wp-totalpages"] > 1) {
            expect(getAllProducts).toHaveProperty("data", expect.any(Array));
        }
        const data = {
            name: "Premium Quality Updated-" +
                randomstring_1.default.generate({
                    length: 4,
                    capitalization: "uppercase",
                    charset: "alphanumeric",
                }),
            type: "simple",
            regular_price: "30.22",
            description: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.",
            short_description: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
            categories: [
                {
                    id: 9,
                },
                {
                    id: 14,
                },
            ],
            images: [
                {
                    src: "http://demo.woothemes.com/woocommerce/wp-content/uploads/sites/56/2013/06/T_2_front.jpg",
                },
                {
                    src: "http://demo.woothemes.com/woocommerce/wp-content/uploads/sites/56/2013/06/T_2_back.jpg",
                },
            ],
        };
        const products = yield wooCommerce.put("products", data, {
            id: getAllProducts.data[0].id,
        });
        expect(products).toBeInstanceOf(Object);
        if (products.headers["x-wp-totalpages"] > 1) {
            expect(products).toHaveProperty("data", expect.any(Array));
        }
        if (products.data) {
            const expectedKeys = Object.keys(productsJson_response_json_1.default[0]);
            const keys = Object.keys(products.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 4)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should delete a product", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllProducts = yield wooCommerce.get("products");
        if (getAllProducts.headers["x-wp-totalpages"] > 1) {
            expect(getAllProducts).toHaveProperty("data", expect.any(Array));
        }
        const products = yield wooCommerce.delete("products", { force: true }, { id: getAllProducts.data[0].id });
        expect(products).toBeInstanceOf(Object);
        if (products.headers["x-wp-totalpages"] > 1) {
            expect(products).toHaveProperty("data", expect.any(Array));
        }
        if (products.data) {
            const expectedKeys = Object.keys(productsJson_response_json_1.default[0]);
            const keys = Object.keys(products.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 4)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
});
describe.only("Test Orders", () => {
    let wooCommerce;
    beforeAll(() => {
        wooCommerce = new index_1.default({
            url: env.url,
            consumerKey: env.consumerKey,
            consumerSecret: env.consumerSecret,
            version: "wc/v3",
            queryStringAuth: false,
        });
    });
    test("should get all orders", () => __awaiter(void 0, void 0, void 0, function* () {
        const orders = yield wooCommerce.get("orders");
        expect(orders).toBeInstanceOf(Object);
        if (orders.headers["x-wp-totalpages"] > 1) {
            expect(orders).toHaveProperty("data", expect.any(Array));
        }
        if (orders.data.length > 0) {
            const expectedKeys = Object.keys(ordersJson_json_1.default[0]);
            const keys = Object.keys(orders.data[0]);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 8)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should get an order", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllOrders = yield wooCommerce.get("orders");
        if (getAllOrders.headers["x-wp-totalpages"] > 1) {
            expect(getAllOrders).toHaveProperty("data", expect.any(Array));
        }
        const orders = yield wooCommerce.get("orders", {
            id: getAllOrders.data[0].id,
        });
        expect(orders).toBeInstanceOf(Object);
        if (orders.headers["x-wp-totalpages"] > 1) {
            expect(orders).toHaveProperty("data", expect.any(Array));
        }
        if (orders.data) {
            const expectedKeys = Object.keys(ordersJson_json_1.default[0]);
            const keys = Object.keys(orders.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 8)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should create an order", () => __awaiter(void 0, void 0, void 0, function* () {
        const data = {
            payment_method: "bacs",
            payment_method_title: "Direct Bank Transfer",
            set_paid: true,
            billing: {
                first_name: `John ${Math.random()}`,
                last_name: "Doe",
                address_1: "969 Market",
                address_2: "",
                city: "San Francisco",
                state: "CA",
                postcode: "94103",
                country: "US",
                email: "john.doe@example.com",
                phone: "85996859001",
                company: "WooCommerce",
            },
            shipping: {
                first_name: "John",
                last_name: "Doe",
                address_1: "969 Market",
                address_2: "",
                city: "San Francisco",
                state: "CA",
                postcode: "94103",
                country: "US",
                company: "WooCommerce",
            },
            line_items: [
                {
                    product_id: 93,
                    quantity: 2,
                },
                {
                    product_id: 22,
                    variation_id: 23,
                    quantity: 1,
                },
            ],
            shipping_lines: [
                {
                    method_id: "flat_rate",
                    method_title: "Flat Rate",
                    total: "10.00",
                },
            ],
        };
        const order = yield wooCommerce.post("orders", data);
        expect(order).toBeInstanceOf(Object);
        if (order.headers["x-wp-totalpages"] > 1) {
            expect(order).toHaveProperty("data", expect.any(Array));
        }
        if (order.data) {
            const expectedKeys = Object.keys(ordersJson_json_1.default[0]);
            const keys = Object.keys(order.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 4)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should update an order", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllCoupons = yield wooCommerce.get("orders");
        if (getAllCoupons.headers["x-wp-totalpages"] > 1) {
            expect(getAllCoupons).toHaveProperty("data", expect.any(Array));
        }
        const data = {
            payment_method: "bacs",
            payment_method_title: "Direct Bank Transfer",
            set_paid: true,
            billing: {
                first_name: `Yuri ${Math.random()}`,
                last_name: "Doe",
                address_1: "969 Market",
                address_2: "",
                city: "San Francisco",
            },
        };
        const order = yield wooCommerce.put("orders", data, {
            id: getAllCoupons.data[0].id,
        });
        expect(order).toBeInstanceOf(Object);
        if (order.headers["x-wp-totalpages"] > 1) {
            expect(order).toHaveProperty("data", expect.any(Array));
        }
        if (order.data) {
            const expectedKeys = Object.keys(ordersJson_json_1.default[0]);
            const keys = Object.keys(order.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 4)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should delete an order", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllCoupons = yield wooCommerce.get("orders");
        if (getAllCoupons.headers["x-wp-totalpages"] > 1) {
            expect(getAllCoupons).toHaveProperty("data", expect.any(Array));
        }
        const order = yield wooCommerce.delete("orders", { force: true }, { id: getAllCoupons.data[0].id });
        console.log("Order", order.data);
        expect(order).toBeInstanceOf(Object);
        if (order.headers["x-wp-totalpages"] > 1) {
            expect(order).toHaveProperty("data", expect.any(Array));
        }
        if (order.data) {
            const expectedKeys = Object.keys(ordersJson_json_1.default[0]);
            const keys = Object.keys(order.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 4)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
});
describe("Test Customers", () => {
    let wooCommerce;
    beforeAll(() => {
        wooCommerce = new index_1.default({
            url: env.url,
            consumerKey: env.consumerKey,
            consumerSecret: env.consumerSecret,
            version: "wc/v3",
            queryStringAuth: false,
        });
    });
    test.only("should get all customers", () => __awaiter(void 0, void 0, void 0, function* () {
        const customers = yield wooCommerce.get("customers");
        expect(customers).toBeInstanceOf(Object);
        if (customers.headers["x-wp-totalpages"] > 1) {
            expect(customers).toHaveProperty("data", expect.any(Array));
        }
        if (customers.data) {
            const expectedKeys = Object.keys(customersJson_json_1.default[0]);
            const keys = Object.keys(customers.data[0]);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 8)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test.only("should get a customer", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllCustomers = yield wooCommerce.get("customers");
        if (getAllCustomers.headers["x-wp-totalpages"] > 1) {
            expect(getAllCustomers).toHaveProperty("data", expect.any(Array));
        }
        const customer = yield wooCommerce.get("customers", {
            id: getAllCustomers.data[0].id,
        });
        console.log("Customer", customer.data);
        expect(customer).toBeInstanceOf(Object);
        if (customer.headers["x-wp-totalpages"] > 1) {
            expect(customer).toHaveProperty("data", expect.any(Array));
        }
        if (customer.data) {
            const expectedKeys = Object.keys(customersJson_json_1.default[0]);
            const keys = Object.keys(customer.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 8)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should create a customer", () => __awaiter(void 0, void 0, void 0, function* () {
        const data = {
            email: "john.doe@example.com",
            first_name: `Yuri`,
            last_name: "Doe",
            username: "john.doe",
            billing: {
                first_name: "John",
                last_name: "Doe",
                company: "",
                address_1: "969 Market",
                address_2: "",
                city: "San Francisco",
                state: "CA",
                postcode: "94103",
                country: "US",
                email: "john.doe@example.com",
                phone: "85996859001",
                number: "123",
                neighborhood: "123",
            },
            shipping: {
                first_name: "John",
                last_name: "Doe",
                company: "",
                address_1: "969 Market",
                address_2: "",
                city: "San Francisco",
                state: "CA",
                postcode: "94103",
                country: "US",
                phone: "85996859001",
                number: "123",
                neighborhood: "123",
            },
        };
        const customer = yield wooCommerce.post("customers", data);
        console.log("Customer", customer.data);
        expect(customer).toBeInstanceOf(Object);
        if (customer.headers["x-wp-totalpages"] > 1) {
            expect(customer).toHaveProperty("data", expect.any(Array));
        }
        if (customer.data) {
            const expectedKeys = Object.keys(customersJson_response_json_1.default[0]);
            const keys = Object.keys(customer.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 8)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test("should update a customer", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllCustomers = yield wooCommerce.get("customers");
        if (getAllCustomers.headers["x-wp-totalpages"] > 1) {
            expect(getAllCustomers).toHaveProperty("data", expect.any(Array));
        }
        const data = {
            email: "y.m.limaTEST@gmail.com",
            first_name: `Yuri`,
            last_name: "Doe",
            username: "john.doe",
            billing: {
                first_name: "John",
                last_name: "Doe",
                company: "",
                address_1: "969 Market",
                address_2: "",
                city: "San Francisco",
                state: "CA",
                postcode: "94103",
                country: "US",
            },
            shipping: {
                first_name: "John",
                last_name: "Doe",
                company: "",
                address_1: "969 Market",
                address_2: "",
                city: "San Francisco",
                state: "CA",
                postcode: "94103",
                country: "US",
            },
        };
        const customer = yield wooCommerce.put("customers", {
            id: getAllCustomers.data[0].id,
            data,
        });
        console.log("Customer", customer.data);
        expect(customer).toBeInstanceOf(Object);
        if (customer.headers["x-wp-totalpages"] > 1) {
            expect(customer).toHaveProperty("data", expect.any(Array));
        }
        if (customer.data) {
            const expectedKeys = Object.keys(customersJson_response_json_1.default[0]);
            const keys = Object.keys(customer.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 8)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
    test.only("should delete a customer", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllCustomers = yield wooCommerce.get("customers");
        if (getAllCustomers.headers["x-wp-totalpages"] > 1) {
            expect(getAllCustomers).toHaveProperty("data", expect.any(Array));
        }
        const customer = yield wooCommerce.delete("customers", { force: true }, { id: getAllCustomers.data[0].id });
        console.log("Customer", customer.data);
        expect(customer).toBeInstanceOf(Object);
        if (customer.headers["x-wp-totalpages"] > 1) {
            expect(customer).toHaveProperty("data", expect.any(Array));
        }
        if (customer.data) {
            const expectedKeys = Object.keys(customersJson_response_json_1.default[0]);
            const keys = Object.keys(customer.data);
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key, index) => {
                if (index === 8)
                    return false;
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }), 20000);
});
function ConsoleMacthKeys(keys, expectedKeys) {
    const arr = [];
    keys.forEach((key, index, array) => {
        arr.push(keys[index]);
        if (index === keys.length - 1) {
            const table = arr.map((key, index) => {
                return {
                    Keys: key,
                    Expected: expectedKeys[index],
                    Macth: key === expectedKeys[index] ? "OK" : "ERROR",
                };
            });
            const table2 = [
                {
                    Keys: keys.length,
                    Expected: expectedKeys.length,
                    Macth: keys.length === expectedKeys.length ? "OK" : "ERROR",
                },
            ];
            console.table(table);
            console.table(table2);
        }
    });
}
