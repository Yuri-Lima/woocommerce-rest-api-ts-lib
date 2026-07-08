/**
 * WooCommerce Store API client (wc/store/v1).
 *
 * Separate from WooCommerceRestApi (admin wc/v3):
 * - No consumerKey / consumerSecret / OAuth
 * - Session via Cart-Token (preferred) or Nonce
 * - Store-specific cart / product / checkout types
 */

import { StoreApiOptionsError } from "./errors.js";
import { StoreHttpClient, type StoreHttpOptions } from "./http.js";
import { CartResource } from "./resources/cart.js";
import { CheckoutResource } from "./resources/checkout.js";
import { ProductsResource } from "./resources/products.js";
import {
  CartSession,
  MemorySessionStore,
  type SessionStore,
} from "./session.js";
import type { StoreApiResponse, StoreCart } from "./types.js";
import type { Method } from "axios";

export interface WooCommerceStoreApiOptions extends StoreHttpOptions {
  /**
   * Persist / restore Cart-Token + Nonce.
   * Default: in-memory store for the process lifetime.
   */
  sessionStore?: SessionStore;
  /** Seed Cart-Token (e.g. restored from cookie / localStorage). */
  cartToken?: string;
  /** Seed Nonce (cookie-mode fallback). */
  nonce?: string;
}

export class WooCommerceStoreApi {
  readonly cart: CartResource;
  readonly products: ProductsResource;
  readonly checkout: CheckoutResource;
  readonly session: CartSession;

  private readonly http: StoreHttpClient;
  private bootstrapped = false;

  constructor(options: WooCommerceStoreApiOptions) {
    if (!options?.url) {
      throw new StoreApiOptionsError("url is required");
    }
    // Guard against accidental admin credentials (mixed concerns).
    const anyOpt = options as WooCommerceStoreApiOptions & {
      consumerKey?: string;
      consumerSecret?: string;
    };
    if (anyOpt.consumerKey || anyOpt.consumerSecret) {
      throw new StoreApiOptionsError(
        "consumerKey/consumerSecret are not used by the Store API. " +
          "Use woocommerce-rest-ts-api for admin REST (wc/v3). " +
          "Store API uses Cart-Token / Nonce session identity only.",
      );
    }

    const store =
      options.sessionStore ??
      new MemorySessionStore({
        cartToken: options.cartToken ?? null,
        nonce: options.nonce ?? null,
      });

    // If custom store + initial token, seed it
    if (options.sessionStore && (options.cartToken || options.nonce)) {
      void Promise.resolve(
        options.sessionStore.set({
          cartToken: options.cartToken ?? null,
          nonce: options.nonce ?? null,
        }),
      );
    }

    this.session = new CartSession(store);
    this.http = new StoreHttpClient(options, this.session);
    this.cart = new CartResource(this.http);
    this.products = new ProductsResource(this.http);
    this.checkout = new CheckoutResource(this.http);
  }

  /**
   * Ensure a cart session exists (obtains Cart-Token via GET /cart).
   * Safe to call multiple times; subsequent calls are no-ops unless force=true.
   */
  async ensureSession(force = false): Promise<StoreCart> {
    if (this.bootstrapped && !force) {
      const token = await this.session.getCartToken();
      if (token) {
        return this.cart.get();
      }
    }
    const cart = await this.cart.get();
    this.bootstrapped = true;
    return cart;
  }

  /** Low-level request for extensions / unmapped routes. */
  async request<T>(
    method: Method,
    endpoint: string,
    options?: {
      query?: Record<string, unknown>;
      body?: unknown;
      headers?: Record<string, string>;
      skipSessionHeaders?: boolean;
    },
  ): Promise<StoreApiResponse<T>> {
    return this.http.request<T>(method, endpoint, options);
  }

  /** POST /batch */
  async batch(requests: unknown[]): Promise<unknown> {
    const res = await this.http.request<unknown>("POST", "batch", {
      body: { requests },
    });
    return res.data;
  }

  /** Current Cart-Token (if any). */
  async getCartToken(): Promise<string | null> {
    return this.session.getCartToken();
  }
}

export default WooCommerceStoreApi;
