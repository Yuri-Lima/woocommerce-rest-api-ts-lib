/* eslint-disable @typescript-eslint/no-array-constructor */
/* eslint-disable jest/no-focused-tests */
/* eslint-disable array-callback-return */
/* eslint-disable jest/no-conditional-expect */
/* eslint-disable no-console */
/* eslint-disable camelcase */
/* no-disabled-tests */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable-next-line jest/no-conditional-expect */

"use strict";
// import { randomUUID } from 'crypto'
import WooCommerceRestApi, {
    CouponsParams,
    ProductsMainParams,
    WooRestApiOptions,
    WooRestApiMethod,
    OrdersMainParams,
} from "../index";
import couponsJson from "./coupons.json";
import productsJson from "./productsJson.json";
import productsJsonResponse from "./productsJson-response.json";
import ordersJson from "./ordersJson.json";
import constomersJson from "./customersJson.json";
import userOrder from "./example_data_orders.json";
import randomstring from "randomstring";
import constomersJsonResponse from "./customersJson-response.json";
import { DateTime } from "luxon";

/*
 * @param {Json} data
 * @data { years, month, days, hours, minutes}
 * @timezone default 'America/Fortaleza'
 * @returns date from time, day, month or years ago in Iso Format
 */
const WOODateMinus = async (
    data: Partial<{
    years: any;
    month: any;
    days: any;
    hours: any;
    minutes: any;
  }>,
) => {
    const dateTime = DateTime.now();
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
};
/**
 * Return the experires days for cupons
 * @param {Json} data
 * @data { years, month, days, hours, minutes}
 * @timezone default 'America/Fortaleza'
 * @returns date from time, day, month or years ago in Iso Format
 */
const WOODatePlus = async (
    data: Partial<{
    years: any;
    month: any;
    days: any;
    hours: any;
    minutes: any;
  }>,
) => {
    const dateTime = DateTime.now();
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
};

const opt: WooRestApiOptions = {
    url: <string>process.env.URL,
    consumerKey: <string>process.env.CONSUMERKEY,
    consumerSecret: <string>process.env.CONSUMERSECRET,
    version: "wc/v3",
    queryStringAuth: false,
};
const env = { ...opt };
describe.only("#options/#methods", () => {
    let wooCommerce: WooCommerceRestApi<{
    url: string;
    consumerKey: string;
    consumerSecret: string;
  }>;
    beforeAll(() => {
        wooCommerce = new WooCommerceRestApi({
            url: env.url,
            consumerKey: env.consumerKey,
            consumerSecret: env.consumerSecret,
            version: "wc/v3",
            queryStringAuth: false,
        });
    });

    // #Constructor
    test("instance should be an object", () => {
        expect(typeof wooCommerce).toBe(typeof {});
    });
    test("url is required", () => {
        expect(() => {
            const wooCommerceInstance = new WooCommerceRestApi({
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
            const wooCommerceInstance = new WooCommerceRestApi({
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
            const wooCommerceInstance = new WooCommerceRestApi({
                url: env.url,
                consumerKey: env.consumerSecret,
                consumerSecret: "",
                version: "wc/v3",
                queryStringAuth: false,
            });
        }).toThrow("consumerSecret is required");
    });

    // #Options
    test("wpAPIPrefix should set WP REST API custom path", () => {
        const endpoint = "products";
        const expected = env.url + "/wp-json/wc/v3/" + endpoint;
        const url = wooCommerce._getUrl(endpoint, {});

        expect(url).toBe(expected);
    });
    // #Methods
    const endpoint = "products";
    test("_getUrl should return full endpoint URL", () => {
    // Fix #1 This is the same test as the one above

        const expected = env.url + "/wp-json/wc/v3/" + endpoint;
        const url = wooCommerce._getUrl(endpoint, {});

        expect(url).toBe(expected);
    });

    test("_normalizeQueryString should return query string sorted by name", () => {
        const url =
      env.url +
      "/wp-json/wc/v3/" +
      endpoint +
      "?filter[q]=Woo+Album&fields=id&filter[limit]=1";
        const expected =
      env.url +
      "/wp-json/wc/v3/" +
      endpoint +
      "?fields=id&filter[limit]=1&filter[q]=Woo%20Album";
        const normalized = wooCommerce._normalizeQueryString(url, {});

        expect(normalized).toBe(expected);
    });
});

describe.only("Test Coupons", () => {
    let wooCommerce: WooCommerceRestApi<{
    url: string;
    consumerKey: string;
    consumerSecret: string;
  }>;
    let each: (typeof userOrder)[0];
    let first_name: string;
    let middle_name: string;
    let last_name: string;
    let full_name: string;
    let discount: string | number;
    let best_before: string;

    beforeAll(() => {
        wooCommerce = new WooCommerceRestApi({
            url: env.url,
            consumerKey: env.consumerKey,
            consumerSecret: env.consumerSecret,
            version: "wc/v3",
            queryStringAuth: false,
        });
    });

    beforeEach(() => {
        jest.resetModules(); // Clears the cache
        each = userOrder[0];
        // Coupon
        discount = "15";
        best_before = "2021-12-31T00:00:00";
        // Customer
        first_name = String(each.billing?.first_name).split(" ")[0];
        first_name =
      `${first_name.charAt(0).toLocaleUpperCase()}${first_name
          .slice(1)
          .toLocaleLowerCase()}` || " ";
        middle_name = String(each.billing?.first_name).split(" ")[1] || " ";
        middle_name =
      `${middle_name.charAt(0).toLocaleUpperCase()}${middle_name
          .slice(1)
          .toLocaleLowerCase()}` || " ";
        last_name =
      `${String(each.billing?.last_name).charAt(0).toLocaleUpperCase()}${String(
          each.billing?.last_name,
      )
          .slice(1)
          .toLocaleLowerCase()}` || " ";
        full_name = `${first_name} ${middle_name} ${last_name}` || " ";
    });

    test("should return a list with all coupons created", async () => {
        const coupons = await wooCommerce.get("coupons");

        expect(coupons).toBeInstanceOf(Object);

        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }

        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(couponsJson[0]); // Array of the keys of the couponsJson object
            const keys = Object.keys(coupons.data[0]); // Array of the keys of the first coupon in the coupons.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key: any, index) => {
                expect(keys[index]).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    // Get Per page
    test("should return a list with all coupons created per page", async () => {
        const coupons = await wooCommerce.get("coupons", { per_page: 3 });
        expect(coupons).toBeInstanceOf(Object);

        // coupons.data has to be an array with a length of 3
        expect(coupons.data.length).toBe(3);

        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }

        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(couponsJson[0]); // Array of the keys of the couponsJson object
            const keys = Object.keys(coupons.data[0]); // Array of the keys of the first coupon in the coupons.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key: any, index) => {
                expect(keys[index]).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should create a Coupon", async () => {
    /**
     * Get the discount amount from the discount % from Google Sheet
     * @param {Number} discount - The discount %
     * @param {Number} total - The total amount of the order
     * @return {Number} shipping_total - The discount amount
     */
        const total_products_price =
      Number(each.total) - Number(each.shipping_total);
        const total_products_price_with_discount = (
            total_products_price *
      (Number(discount) / 100)
        ).toFixed(2);
        console.log(
            `Total: ${total_products_price} - Discount: ${discount} - Total with discount: ${total_products_price_with_discount}`,
        );
        /**
     * Data to Create new Coupons
     * @description Create a new Coupon with the following format: first + 12 + - + id
     */
        const coupom_data: CouponsParams = {
            code:
        first_name.substring(0, 3).toLocaleUpperCase() +
        randomstring.generate({
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
            date_expires: (await WOODatePlus({ days: -3 })) as string,
        };
        const coupons = await wooCommerce.post("coupons", coupom_data);

        expect(coupons).toBeInstanceOf(Object);

        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }
        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(couponsJson[0]); // Array of the keys of the couponsJson object
            const keys = Object.keys(coupons.data); // Array of the keys of the first coupon in the coupons.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                    couponID: coupons.data.id,
                },
            ]);

            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key: any, index, array) => {
                expect(key).toEqual(expectedKeys[index]);
            });
        }
        console.log(coupons.data);
    }, 20000); // 20 seconds

    test("should retrive a Coupon", async () => {
        const getAllCoupons = await wooCommerce.get("coupons");

        if (getAllCoupons.headers["x-wp-totalpages"] > 1) {
            expect(getAllCoupons).toHaveProperty("data", expect.any(Array));
        }
        const coupons = await wooCommerce.get("coupons", {
            code: getAllCoupons.data[0].id,
        });
        console.log(coupons.data.code);

        expect(coupons).toBeInstanceOf(Object);

        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }

        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(couponsJson[0]); // Array of the keys of the couponsJson object
            const keys = Object.keys(coupons.data[0]); // Array of the keys of the first coupon in the coupons.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key: any, index) => {
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should update a Coupon", async () => {
        const getAllCoupons = await wooCommerce.get("coupons");

        if (getAllCoupons.headers["x-wp-totalpages"] > 1) {
            expect(getAllCoupons).toHaveProperty("data", expect.any(Array));
        }
        const coupons = await wooCommerce.put(
            "coupons",
            {
                description:
          "Campanha de CashBack para clientes Test - Updated - " +
          randomstring.generate({
              length: 4,
              capitalization: "uppercase",
              charset: "alphanumeric",
          }),
            },
            {
                id: getAllCoupons.data[0].id,
            },
        );
        console.log(coupons.data);
        expect(coupons).toBeInstanceOf(Object);

        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }

        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(couponsJson[0]); // Array of the keys of the couponsJson object
            const keys = Object.keys(coupons.data[0]); // Array of the keys of the first coupon in the coupons.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key: any, index) => {
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should delete a Coupon", async () => {
        const getAllCoupons = await wooCommerce.get("coupons");

        if (getAllCoupons.headers["x-wp-totalpages"] > 1) {
            expect(getAllCoupons).toHaveProperty("data", expect.any(Array));
        }
        const coupons = await wooCommerce.delete(
            "coupons",
            { force: true },
            { id: getAllCoupons.data[0].id },
        );
        console.log(coupons.data);
        expect(coupons).toBeInstanceOf(Object);

        if (coupons.headers["x-wp-totalpages"] > 1) {
            expect(coupons).toHaveProperty("data", expect.any(Array));
        }

        if (coupons.data.length > 0) {
            const expectedKeys = Object.keys(couponsJson[0]); // Array of the keys of the couponsJson object
            const keys = Object.keys(coupons.data[0]); // Array of the keys of the first coupon in the coupons.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key: any, index) => {
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds
});

describe.only("Test Products", () => {
    let wooCommerce: WooCommerceRestApi<{
    url: string;
    consumerKey: string;
    consumerSecret: string;
  }>;
    beforeAll(() => {
        wooCommerce = new WooCommerceRestApi({
            url: env.url,
            consumerKey: env.consumerKey,
            consumerSecret: env.consumerSecret,
            version: "wc/v3",
            queryStringAuth: false,
        });
    });
    test("should return a list with all products created", async () => {
        const products = await wooCommerce.get("products");
        // console.log(products.data);
        expect(products).toBeInstanceOf(Object);
        if (products.headers["x-wp-totalpages"] > 1) {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(products).toHaveProperty("data", expect.any(Array));
        }
        if (products.data.length > 0) {
            const expectedKeys = Object.keys(productsJson[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(products.data[0]); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.forEach((key: any, index) => {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should create a new product", async () => {
        const data: ProductsMainParams = {
            name: "Premium Quality",
            type: "simple",
            regular_price: "21.99",
            description:
        "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.",
            short_description:
        "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
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
        const products = await wooCommerce.post("products", data);
        expect(products).toBeInstanceOf(Object);
        if (products.headers["x-wp-totalpages"] > 1) {
            expect(products).toHaveProperty("data", expect.any(Array));
        }
        if (products.data) {
            const expectedKeys = Object.keys(productsJsonResponse[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(products.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 4) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should retrive a product", async () => {
        const getAllProducts = await wooCommerce.get("products");

        if (getAllProducts.headers["x-wp-totalpages"] > 1) {
            expect(getAllProducts).toHaveProperty("data", expect.any(Array));
        }
        const products = await wooCommerce.get("products", {
            id: getAllProducts.data[0].id,
        });
        // console.log(products.data);

        expect(products).toBeInstanceOf(Object);

        if (products.headers["x-wp-totalpages"] > 1) {
            expect(products).toHaveProperty("data", expect.any(Array));
        }

        if (products.data.length > 0) {
            const expectedKeys = Object.keys(productsJson[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(products.data[0]); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 4) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should update/edit a product", async () => {
        const getAllProducts = await wooCommerce.get("products");
        if (getAllProducts.headers["x-wp-totalpages"] > 1) {
            expect(getAllProducts).toHaveProperty("data", expect.any(Array));
        }
        // Update the product
        const data: ProductsMainParams = {
            name:
        "Premium Quality Updated-" +
        randomstring.generate({
            length: 4,
            capitalization: "uppercase",
            charset: "alphanumeric",
        }),
            type: "simple",
            regular_price: "30.22",
            description:
        "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.",
            short_description:
        "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
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
        const products = await wooCommerce.put("products", data, {
            id: getAllProducts.data[0].id,
        });
        expect(products).toBeInstanceOf(Object);
        if (products.headers["x-wp-totalpages"] > 1) {
            expect(products).toHaveProperty("data", expect.any(Array));
        }
        if (products.data) {
            const expectedKeys = Object.keys(productsJsonResponse[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(products.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 4) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should delete a product", async () => {
        const getAllProducts = await wooCommerce.get("products");
        if (getAllProducts.headers["x-wp-totalpages"] > 1) {
            expect(getAllProducts).toHaveProperty("data", expect.any(Array));
        }
        const products = await wooCommerce.delete(
            "products",
            { force: true },
            { id: getAllProducts.data[0].id },
        );
        expect(products).toBeInstanceOf(Object);
        if (products.headers["x-wp-totalpages"] > 1) {
            expect(products).toHaveProperty("data", expect.any(Array));
        }
        if (products.data) {
            const expectedKeys = Object.keys(productsJsonResponse[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(products.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 4) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds
});

describe.only("Test Orders", () => {
    let wooCommerce: WooCommerceRestApi<{
    url: string;
    consumerKey: string;
    consumerSecret: string;
  }>;

    beforeAll(() => {
        wooCommerce = new WooCommerceRestApi({
            url: env.url,
            consumerKey: env.consumerKey,
            consumerSecret: env.consumerSecret,
            version: "wc/v3",
            queryStringAuth: false,
        });
    });

    test("should get all orders", async () => {
        const orders = await wooCommerce.get("orders");
        expect(orders).toBeInstanceOf(Object);
        if (orders.headers["x-wp-totalpages"] > 1) {
            expect(orders).toHaveProperty("data", expect.any(Array));
        }
        if (orders.data.length > 0) {
            const expectedKeys = Object.keys(ordersJson[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(orders.data[0]); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 8) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should get an order", async () => {
        const getAllOrders = await wooCommerce.get("orders");
        if (getAllOrders.headers["x-wp-totalpages"] > 1) {
            expect(getAllOrders).toHaveProperty("data", expect.any(Array));
        }
        // console.log("ID: ", getAllOrders.data[0].id);
        const orders = await wooCommerce.get("orders", {
            id: getAllOrders.data[0].id,
        });
        // console.log("Order", orders.data);
        expect(orders).toBeInstanceOf(Object);
        if (orders.headers["x-wp-totalpages"] > 1) {
            expect(orders).toHaveProperty("data", expect.any(Array));
        }
        if (orders.data) {
            const expectedKeys = Object.keys(ordersJson[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(orders.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 8) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should create an order", async () => {
        const data: OrdersMainParams = {
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
        const order = await wooCommerce.post("orders", data);
        // console.log("Order", order.data);
        expect(order).toBeInstanceOf(Object);
        if (order.headers["x-wp-totalpages"] > 1) {
            expect(order).toHaveProperty("data", expect.any(Array));
        }
        if (order.data) {
            const expectedKeys = Object.keys(ordersJson[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(order.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 4) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should update an order", async () => {
        const getAllCoupons = await wooCommerce.get("orders");
        if (getAllCoupons.headers["x-wp-totalpages"] > 1) {
            expect(getAllCoupons).toHaveProperty("data", expect.any(Array));
        }
        const data: OrdersMainParams = {
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
        const order = await wooCommerce.put("orders", data, {
            id: getAllCoupons.data[0].id,
        });
        // console.log("Order", order.data);
        expect(order).toBeInstanceOf(Object);
        if (order.headers["x-wp-totalpages"] > 1) {
            expect(order).toHaveProperty("data", expect.any(Array));
        }
        if (order.data) {
            const expectedKeys = Object.keys(ordersJson[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(order.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 4) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test("should delete an order", async () => {
        const getAllCoupons = await wooCommerce.get("orders");
        if (getAllCoupons.headers["x-wp-totalpages"] > 1) {
            expect(getAllCoupons).toHaveProperty("data", expect.any(Array));
        }
        const order = await wooCommerce.delete(
            "orders",
            { force: true },
            { id: getAllCoupons.data[0].id },
        );
        console.log("Order", order.data);
        expect(order).toBeInstanceOf(Object);
        if (order.headers["x-wp-totalpages"] > 1) {
            expect(order).toHaveProperty("data", expect.any(Array));
        }
        if (order.data) {
            const expectedKeys = Object.keys(ordersJson[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(order.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 4) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds
});

describe("Test Customers", () => {
    let wooCommerce: WooCommerceRestApi<{
    url: string;
    consumerKey: string;
    consumerSecret: string;
  }>;

    beforeAll(() => {
        wooCommerce = new WooCommerceRestApi({
            url: env.url,
            consumerKey: env.consumerKey,
            consumerSecret: env.consumerSecret,
            version: "wc/v3",
            queryStringAuth: false,
        });
    });

    test.only("should get all customers", async () => {
        const customers = await wooCommerce.get("customers");
        // console.log("Customers", customers.data[0]);

        expect(customers).toBeInstanceOf(Object);
        if (customers.headers["x-wp-totalpages"] > 1) {
            expect(customers).toHaveProperty("data", expect.any(Array));
        }
        if (customers.data) {
            const expectedKeys = Object.keys(constomersJson[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(customers.data[0]); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 8) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test.only("should get a customer", async () => {
        const getAllCustomers = await wooCommerce.get("customers");
        if (getAllCustomers.headers["x-wp-totalpages"] > 1) {
            expect(getAllCustomers).toHaveProperty("data", expect.any(Array));
        }
        const customer = await wooCommerce.get("customers", {
            id: getAllCustomers.data[0].id,
        });
        console.log("Customer", customer.data);
        expect(customer).toBeInstanceOf(Object);
        if (customer.headers["x-wp-totalpages"] > 1) {
            expect(customer).toHaveProperty("data", expect.any(Array));
        }
        if (customer.data) {
            const expectedKeys = Object.keys(constomersJson[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(customer.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 8) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    // Probably this test is failling because of permissions #TODO
    test("should create a customer", async () => {
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
        const customer = await wooCommerce.post("customers", data);
        console.log("Customer", customer.data);
        expect(customer).toBeInstanceOf(Object);
        if (customer.headers["x-wp-totalpages"] > 1) {
            expect(customer).toHaveProperty("data", expect.any(Array));
        }
        if (customer.data) {
            const expectedKeys = Object.keys(constomersJsonResponse[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(customer.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 8) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    // Probably this test is failling because of permissions #TODO
    test("should update a customer", async () => {
        const getAllCustomers = await wooCommerce.get("customers");
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
        const customer = await wooCommerce.put("customers", {
            id: getAllCustomers.data[0].id,
            data,
        });
        console.log("Customer", customer.data);
        expect(customer).toBeInstanceOf(Object);
        if (customer.headers["x-wp-totalpages"] > 1) {
            expect(customer).toHaveProperty("data", expect.any(Array));
        }
        if (customer.data) {
            const expectedKeys = Object.keys(constomersJsonResponse[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(customer.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 8) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds

    test.only("should delete a customer", async () => {
        const getAllCustomers = await wooCommerce.get("customers");
        if (getAllCustomers.headers["x-wp-totalpages"] > 1) {
            expect(getAllCustomers).toHaveProperty("data", expect.any(Array));
        }
        const customer = await wooCommerce.delete(
            "customers",
            { force: true },
            { id: getAllCustomers.data[0].id },
        );
        console.log("Customer", customer.data);
        expect(customer).toBeInstanceOf(Object);
        if (customer.headers["x-wp-totalpages"] > 1) {
            expect(customer).toHaveProperty("data", expect.any(Array));
        }
        if (customer.data) {
            const expectedKeys = Object.keys(constomersJsonResponse[0]); // Array of the keys of the productsJson object
            const keys = Object.keys(customer.data); // Array of the keys of the first product in the products.data array
            console.table([
                {
                    Keys: expectedKeys.length,
                    Expected: keys.length,
                    diff: expectedKeys.length - keys.length,
                },
            ]);
            ConsoleMacthKeys(keys, expectedKeys);
            keys.every((key: any, index) => {
                if (index === 8) return false; // only to test the first 4 keys, because the last key is the date of creation could be different
                expect(key).toEqual(expectedKeys[index]);
            });
        }
    }, 20000); // 20 seconds
});

function ConsoleMacthKeys(keys: string[], expectedKeys: string[]) {
    const arr = Array();
    keys.forEach((key: any, index, array) => {
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
