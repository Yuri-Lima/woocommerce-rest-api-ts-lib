/**
 * Store API domain types (wc/store/v1).
 * Intentionally separate from admin REST models in woocommerce-rest-ts-api.
 */

export type StoreApiVersion = "wc/store/v1" | string;

export interface StoreMoney {
  currency_code?: string;
  currency_symbol?: string;
  currency_minor_unit?: number;
  currency_decimal_separator?: string;
  currency_thousand_separator?: string;
  currency_prefix?: string;
  currency_suffix?: string;
  [key: string]: unknown;
}

export interface StoreCartTotals extends StoreMoney {
  total_items?: string;
  total_items_tax?: string;
  total_fees?: string;
  total_fees_tax?: string;
  total_discount?: string;
  total_discount_tax?: string;
  total_shipping?: string;
  total_shipping_tax?: string;
  total_price?: string;
  total_tax?: string;
  tax_lines?: unknown[];
}

export interface StoreCartItem {
  key: string;
  id: number;
  quantity: number;
  name?: string;
  type?: string;
  quantity_limits?: {
    minimum?: number;
    maximum?: number;
    multiple_of?: number;
    editable?: boolean;
  };
  short_description?: string;
  description?: string;
  sku?: string;
  low_stock_remaining?: number | null;
  backorders_allowed?: boolean;
  show_backorder_badge?: boolean;
  sold_individually?: boolean;
  permalink?: string;
  images?: unknown[];
  variation?: Array<{ attribute: string; value: string }>;
  item_data?: unknown[];
  prices?: Record<string, unknown>;
  totals?: Record<string, unknown>;
  catalog_visibility?: string;
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface StoreCartCoupon {
  code: string;
  discount_type?: string;
  totals?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface StoreAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface StoreShippingRate {
  rate_id: string;
  name?: string;
  description?: string;
  delivery_time?: string;
  price?: string;
  taxes?: string;
  instance_id?: number;
  method_id?: string;
  meta_data?: unknown[];
  selected?: boolean;
  currency_code?: string;
  currency_symbol?: string;
  [key: string]: unknown;
}

export interface StoreShippingPackage {
  package_id: number | string;
  name?: string;
  destination?: StoreAddress;
  items?: unknown[];
  shipping_rates?: StoreShippingRate[];
  [key: string]: unknown;
}

/** Full cart envelope returned by most cart mutations. */
export interface StoreCart {
  items: StoreCartItem[];
  coupons: StoreCartCoupon[];
  fees?: unknown[];
  totals: StoreCartTotals;
  shipping_address?: StoreAddress;
  billing_address?: StoreAddress;
  needs_payment?: boolean;
  needs_shipping?: boolean;
  payment_requirements?: string[];
  has_calculated_shipping?: boolean;
  shipping_rates?: StoreShippingPackage[];
  items_count?: number;
  items_weight?: number;
  cross_sells?: unknown[];
  errors?: unknown[];
  payment_methods?: string[];
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface StoreProductImage {
  id?: number;
  src?: string;
  thumbnail?: string;
  srcset?: string;
  sizes?: string;
  name?: string;
  alt?: string;
  [key: string]: unknown;
}

export interface StoreProductPrices extends StoreMoney {
  price?: string;
  regular_price?: string;
  sale_price?: string;
  price_range?: unknown;
  raw_prices?: unknown;
}

/** Storefront product — not the admin Products model. */
export interface StoreProduct {
  id: number;
  name?: string;
  slug?: string;
  parent?: number;
  type?: string;
  variation?: string;
  permalink?: string;
  sku?: string;
  short_description?: string;
  description?: string;
  on_sale?: boolean;
  prices?: StoreProductPrices;
  price_html?: string;
  average_rating?: string;
  review_count?: number;
  images?: StoreProductImage[];
  categories?: Array<{ id: number; name?: string; slug?: string }>;
  tags?: Array<{ id: number; name?: string; slug?: string }>;
  brands?: Array<{ id: number; name?: string; slug?: string }>;
  attributes?: unknown[];
  variations?: number[];
  has_options?: boolean;
  is_purchasable?: boolean;
  is_in_stock?: boolean;
  is_on_backorder?: boolean;
  low_stock_remaining?: number | null;
  stock_availability?: { text?: string; class?: string };
  sold_individually?: boolean;
  add_to_cart?: {
    text?: string;
    description?: string;
    url?: string;
    minimum?: number;
    maximum?: number;
    multiple_of?: number;
  };
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface StoreCheckout {
  order_id?: number;
  status?: string;
  order_key?: string;
  customer_note?: string;
  customer_id?: number;
  billing_address?: StoreAddress;
  shipping_address?: StoreAddress;
  payment_method?: string;
  payment_result?: {
    payment_status?: string;
    payment_details?: unknown[];
    redirect_url?: string;
  };
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AddToCartInput {
  id: number;
  quantity: number;
  variation?: Array<{ attribute: string; value: string }>;
  [key: string]: unknown;
}

export interface UpdateCartItemInput {
  key: string;
  quantity: number;
}

export interface SelectShippingRateInput {
  package_id: number | string;
  rate_id: string;
}

export interface UpdateCustomerInput {
  billing_address?: Partial<StoreAddress>;
  shipping_address?: Partial<StoreAddress>;
  [key: string]: unknown;
}

export interface CheckoutProcessInput {
  billing_address?: Partial<StoreAddress>;
  shipping_address?: Partial<StoreAddress>;
  payment_method?: string;
  customer_note?: string;
  create_account?: boolean;
  payment_data?: Array<{ key: string; value: string }>;
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProductListParams {
  page?: number;
  per_page?: number;
  search?: string;
  order?: "asc" | "desc";
  orderby?: string;
  category?: string;
  tag?: string;
  type?: string;
  on_sale?: boolean;
  min_price?: string;
  max_price?: string;
  stock_status?: string | string[];
  featured?: boolean;
  attribute?: string;
  attribute_term?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface StoreApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}
