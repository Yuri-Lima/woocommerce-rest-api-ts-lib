/**
 * woo-store-ts-api — WooCommerce Store API (wc/store/v1) client.
 *
 * Admin REST (wc/v3) lives in woocommerce-rest-ts-api — do not mix.
 */

export {
  WooCommerceStoreApi,
  type WooCommerceStoreApiOptions,
} from "./client.js";
export { default } from "./client.js";

export {
  CartSession,
  MemorySessionStore,
  type SessionSnapshot,
  type SessionStore,
} from "./session.js";

export {
  StoreApiError,
  StoreApiOptionsError,
  isSessionRelatedCode,
} from "./errors.js";

export type {
  AddToCartInput,
  CheckoutProcessInput,
  ProductListParams,
  SelectShippingRateInput,
  StoreAddress,
  StoreApiResponse,
  StoreApiVersion,
  StoreCart,
  StoreCartCoupon,
  StoreCartItem,
  StoreCartTotals,
  StoreCheckout,
  StoreMoney,
  StoreProduct,
  StoreProductImage,
  StoreProductPrices,
  StoreShippingPackage,
  StoreShippingRate,
  UpdateCartItemInput,
  UpdateCustomerInput,
} from "./types.js";

export { CartResource } from "./resources/cart.js";
export { ProductsResource } from "./resources/products.js";
export { CheckoutResource } from "./resources/checkout.js";
