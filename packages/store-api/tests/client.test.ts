import nock from "nock";
import {
  WooCommerceStoreApi,
  StoreApiError,
  StoreApiOptionsError,
} from "../src/index.js";
import {
  TEST_BASE,
  createClient,
  emptyCart,
  cartWithItem,
  storePath,
} from "./helpers.js";

describe("WooCommerceStoreApi construction", () => {
  it("requires url", () => {
    expect(
      () => new WooCommerceStoreApi({ url: "" } as { url: string }),
    ).toThrow(StoreApiOptionsError);
  });

  it("rejects consumerKey / consumerSecret (admin credentials)", () => {
    expect(
      () =>
        new WooCommerceStoreApi({
          url: TEST_BASE,
          // @ts-expect-error intentional misuse
          consumerKey: "ck_x",
          consumerSecret: "cs_y",
        }),
    ).toThrow(/consumerKey/);
  });
});

describe("cart + session headers", () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it("ensureSession captures Cart-Token from GET /cart", async () => {
    nock(TEST_BASE)
      .get(storePath("/cart"))
      .reply(200, emptyCart, { "Cart-Token": "session-token-1" });

    const client = createClient();
    const cart = await client.ensureSession();
    expect(cart.items).toEqual([]);
    expect(await client.getCartToken()).toBe("session-token-1");
  });

  it("addItem sends Cart-Token and returns cart", async () => {
    nock(TEST_BASE)
      .get(storePath("/cart"))
      .reply(200, emptyCart, { "Cart-Token": "tok-abc" });

    nock(TEST_BASE)
      .post(storePath("/cart/add-item"), (body) => {
        return body.id === 34 && body.quantity === 2;
      })
      .matchHeader("Cart-Token", "tok-abc")
      .reply(200, cartWithItem, { "Cart-Token": "tok-abc" });

    const client = createClient();
    await client.ensureSession();
    const cart = await client.cart.addItem({ id: 34, quantity: 2 });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.key).toBe("abc123");
  });

  it("updateItem / removeItem / coupons", async () => {
    const client = createClient({ cartToken: "fixed" });

    nock(TEST_BASE)
      .post(storePath("/cart/update-item"), { key: "abc123", quantity: 1 })
      .matchHeader("Cart-Token", "fixed")
      .reply(200, { ...cartWithItem, items: [{ ...cartWithItem.items[0], quantity: 1 }] });

    nock(TEST_BASE)
      .post(storePath("/cart/remove-item"), { key: "abc123" })
      .reply(200, emptyCart);

    nock(TEST_BASE)
      .post(storePath("/cart/apply-coupon"), { code: "SAVE10" })
      .reply(200, { ...emptyCart, coupons: [{ code: "SAVE10" }] });

    nock(TEST_BASE)
      .post(storePath("/cart/remove-coupon"), { code: "SAVE10" })
      .reply(200, emptyCart);

    await client.cart.updateItem({ key: "abc123", quantity: 1 });
    await client.cart.removeItem("abc123");
    const withCoupon = await client.cart.applyCoupon("SAVE10");
    expect(withCoupon.coupons[0]?.code).toBe("SAVE10");
    await client.cart.removeCoupon("SAVE10");
  });

  it("updateCustomer and selectShippingRate", async () => {
    const client = createClient({ cartToken: "t" });

    nock(TEST_BASE)
      .post(storePath("/cart/update-customer"))
      .reply(200, {
        ...emptyCart,
        billing_address: { country: "US", email: "a@b.com" },
      });

    nock(TEST_BASE)
      .post(storePath("/cart/select-shipping-rate"), {
        package_id: 0,
        rate_id: "flat_rate:1",
      })
      .reply(200, emptyCart);

    const c = await client.cart.updateCustomer({
      billing_address: { country: "US", email: "a@b.com" },
    });
    expect(c.billing_address?.country).toBe("US");
    await client.cart.selectShippingRate({
      package_id: 0,
      rate_id: "flat_rate:1",
    });
  });

  it("throws StoreApiError on 403 with session flag", async () => {
    nock(TEST_BASE)
      .get(storePath("/cart"))
      .reply(403, {
        code: "woocommerce_rest_invalid_nonce",
        message: "Invalid nonce",
      });

    const client = createClient();
    await expect(client.cart.get()).rejects.toMatchObject({
      name: "StoreApiError",
      status: 403,
      isSessionError: true,
    } satisfies Partial<StoreApiError>);
  });
});

describe("products", () => {
  afterEach(() => nock.cleanAll());

  it("lists and gets products", async () => {
    const products = [
      { id: 1, name: "Beanie", prices: { price: "1000" } },
      { id: 2, name: "Cap", prices: { price: "1500" } },
    ];
    nock(TEST_BASE)
      .get(storePath("/products"))
      .query({ per_page: "10" })
      .reply(200, products);

    nock(TEST_BASE)
      .get(storePath("/products/1"))
      .reply(200, products[0]);

    const client = createClient();
    const list = await client.products.list({ per_page: 10 });
    expect(list).toHaveLength(2);
    const one = await client.products.get(1);
    expect(one.name).toBe("Beanie");
  });

  it("catalog helpers", async () => {
    nock(TEST_BASE)
      .get(storePath("/products/categories"))
      .query(true)
      .reply(200, [{ id: 9, name: "Clothing" }]);
    nock(TEST_BASE)
      .get(storePath("/products/tags"))
      .query(true)
      .reply(200, []);
    nock(TEST_BASE)
      .get(storePath("/products/attributes"))
      .query(true)
      .reply(200, []);
    nock(TEST_BASE)
      .get(storePath("/products/reviews"))
      .query(true)
      .reply(200, []);
    nock(TEST_BASE)
      .get(storePath("/products/collection-data"))
      .query(true)
      .reply(200, { price_range: {} });

    const client = createClient();
    expect(await client.products.listCategories()).toHaveLength(1);
    expect(await client.products.listTags()).toEqual([]);
    expect(await client.products.listAttributes()).toEqual([]);
    expect(await client.products.listReviews()).toEqual([]);
    expect(await client.products.collectionData()).toMatchObject({
      price_range: {},
    });
  });
});

describe("checkout + batch + request", () => {
  afterEach(() => nock.cleanAll());

  it("checkout process / update / payForOrder", async () => {
    nock(TEST_BASE)
      .get(storePath("/checkout"))
      .reply(200, { order_id: 0, status: "checkout-draft" });

    nock(TEST_BASE)
      .post(storePath("/checkout"), (body) => body.payment_method === "bacs")
      .reply(200, {
        order_id: 55,
        status: "processing",
        order_key: "wc_order_x",
        payment_result: { payment_status: "success", redirect_url: "" },
      });

    nock(TEST_BASE)
      .put(storePath("/checkout"))
      .reply(200, { order_id: 0, customer_note: "hi" });

    nock(TEST_BASE)
      .post(storePath("/checkout/99"))
      .reply(200, { order_id: 99, status: "pending" });

    const client = createClient({ cartToken: "t" });
    const draft = await client.checkout.get();
    expect(draft.status).toBe("checkout-draft");
    const order = await client.checkout.process({ payment_method: "bacs" });
    expect(order.order_id).toBe(55);
    const updated = await client.checkout.update({ customer_note: "hi" });
    expect(updated.customer_note).toBe("hi");
    const paid = await client.checkout.payForOrder(99, {
      payment_method: "bacs",
    });
    expect(paid.order_id).toBe(99);
  });

  it("batch, cart items, and raw request", async () => {
    nock(TEST_BASE)
      .post(storePath("/batch"))
      .reply(200, { responses: [] });

    nock(TEST_BASE)
      .get(storePath("/cart/items"))
      .reply(200, []);

    nock(TEST_BASE)
      .delete(storePath("/cart/items"))
      .reply(200, emptyCart);

    nock(TEST_BASE)
      .get(storePath("/cart/items"))
      .reply(200, []);

    const client = createClient({ cartToken: "t" });
    await client.batch([]);
    expect(await client.cart.listItems()).toEqual([]);
    await client.cart.clearItems();
    const items = await client.request<unknown[]>("GET", "cart/items");
    expect(items.data).toEqual([]);
    expect(items.status).toBe(200);
  });

  it("ensureSession reuses token without force", async () => {
    nock(TEST_BASE)
      .get(storePath("/cart"))
      .times(2)
      .reply(200, emptyCart, { "Cart-Token": "same" });

    const client = createClient();
    await client.ensureSession();
    await client.ensureSession();
    expect(await client.getCartToken()).toBe("same");
  });

  it("sends Nonce when only nonce is seeded", async () => {
    nock(TEST_BASE)
      .get(storePath("/cart"))
      .matchHeader("Nonce", "nonce-only")
      .reply(200, emptyCart, { Nonce: "nonce-rotated" });

    const client = createClient({ nonce: "nonce-only" });
    await client.cart.get();
    // After response, nonce may update; Cart-Token still absent
    expect(await client.getCartToken()).toBeNull();
  });
});
