import { WooCommerceStoreApi } from "../src/index.js";

export const TEST_BASE = "https://shop.test";
export const STORE_PREFIX = "/wp-json/wc/store/v1";

export function storePath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${STORE_PREFIX}${p}`;
}

export function createClient(opts: { cartToken?: string; nonce?: string } = {}) {
  return new WooCommerceStoreApi({
    url: TEST_BASE,
    cartToken: opts.cartToken,
    nonce: opts.nonce,
    timeoutMs: 5_000,
  });
}

export const emptyCart = {
  items: [] as unknown[],
  coupons: [] as unknown[],
  totals: {
    total_price: "0",
    total_items: "0",
    currency_code: "USD",
  },
  items_count: 0,
  needs_payment: false,
  needs_shipping: false,
};

export const cartWithItem = {
  ...emptyCart,
  items: [
    {
      key: "abc123",
      id: 34,
      quantity: 2,
      name: "Beanie",
    },
  ],
  items_count: 2,
  totals: {
    total_price: "3600",
    total_items: "3600",
    currency_code: "USD",
    currency_minor_unit: 2,
  },
};
