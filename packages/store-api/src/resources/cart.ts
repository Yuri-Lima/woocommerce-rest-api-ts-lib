/**
 * Cart resource — wc/store/v1/cart*
 */

import type { StoreHttpClient } from "../http.js";
import type {
  AddToCartInput,
  SelectShippingRateInput,
  StoreCart,
  UpdateCartItemInput,
  UpdateCustomerInput,
} from "../types.js";

export class CartResource {
  constructor(private readonly http: StoreHttpClient) {}

  /** GET /cart — also bootstraps Cart-Token from response headers. */
  async get(): Promise<StoreCart> {
    const res = await this.http.request<StoreCart>("GET", "cart");
    return res.data;
  }

  /** POST /cart/add-item */
  async addItem(input: AddToCartInput): Promise<StoreCart> {
    const body = {
      id: input.id,
      quantity: input.quantity,
      variation: input.variation ?? [],
      ...omitKeys(input, ["id", "quantity", "variation"]),
    };
    const res = await this.http.request<StoreCart>("POST", "cart/add-item", {
      body,
    });
    return res.data;
  }

  /** POST /cart/update-item */
  async updateItem(input: UpdateCartItemInput): Promise<StoreCart> {
    const res = await this.http.request<StoreCart>("POST", "cart/update-item", {
      body: { key: input.key, quantity: input.quantity },
    });
    return res.data;
  }

  /** POST /cart/remove-item */
  async removeItem(key: string): Promise<StoreCart> {
    const res = await this.http.request<StoreCart>("POST", "cart/remove-item", {
      body: { key },
    });
    return res.data;
  }

  /** POST /cart/apply-coupon */
  async applyCoupon(code: string): Promise<StoreCart> {
    const res = await this.http.request<StoreCart>("POST", "cart/apply-coupon", {
      body: { code },
    });
    return res.data;
  }

  /** POST /cart/remove-coupon */
  async removeCoupon(code: string): Promise<StoreCart> {
    const res = await this.http.request<StoreCart>(
      "POST",
      "cart/remove-coupon",
      { body: { code } },
    );
    return res.data;
  }

  /** POST /cart/update-customer */
  async updateCustomer(input: UpdateCustomerInput): Promise<StoreCart> {
    const res = await this.http.request<StoreCart>(
      "POST",
      "cart/update-customer",
      { body: input },
    );
    return res.data;
  }

  /** POST /cart/select-shipping-rate */
  async selectShippingRate(input: SelectShippingRateInput): Promise<StoreCart> {
    const res = await this.http.request<StoreCart>(
      "POST",
      "cart/select-shipping-rate",
      {
        body: {
          package_id: input.package_id,
          rate_id: input.rate_id,
        },
      },
    );
    return res.data;
  }

  /** GET /cart/items */
  async listItems(): Promise<unknown> {
    const res = await this.http.request<unknown>("GET", "cart/items");
    return res.data;
  }

  /** DELETE /cart/items — empty cart */
  async clearItems(): Promise<unknown> {
    const res = await this.http.request<unknown>("DELETE", "cart/items");
    return res.data;
  }
}

function omitKeys<T extends Record<string, unknown>>(
  obj: T,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!keys.includes(k)) out[k] = v;
  }
  return out;
}
