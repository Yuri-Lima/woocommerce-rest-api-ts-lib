/**
 * Checkout — wc/store/v1/checkout*
 */

import type { StoreHttpClient } from "../http.js";
import type { CheckoutProcessInput, StoreCheckout } from "../types.js";

export class CheckoutResource {
  constructor(private readonly http: StoreHttpClient) {}

  /** GET /checkout */
  async get(): Promise<StoreCheckout> {
    const res = await this.http.request<StoreCheckout>("GET", "checkout");
    return res.data;
  }

  /** POST /checkout — process checkout / place order */
  async process(input: CheckoutProcessInput = {}): Promise<StoreCheckout> {
    const res = await this.http.request<StoreCheckout>("POST", "checkout", {
      body: input,
    });
    return res.data;
  }

  /** PUT /checkout — update draft checkout fields */
  async update(input: CheckoutProcessInput = {}): Promise<StoreCheckout> {
    const res = await this.http.request<StoreCheckout>("PUT", "checkout", {
      body: input,
    });
    return res.data;
  }

  /** POST /checkout/:id — pay for existing order */
  async payForOrder(
    orderId: number,
    input: CheckoutProcessInput = {},
  ): Promise<StoreCheckout> {
    const res = await this.http.request<StoreCheckout>(
      "POST",
      `checkout/${orderId}`,
      { body: input },
    );
    return res.data;
  }
}
