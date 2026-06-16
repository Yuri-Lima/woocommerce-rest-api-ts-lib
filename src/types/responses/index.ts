import type {
    Meta_Data,
    Links,
    Billing,
    Shipping,
    Shipping_Lines,
    Line_Items,
    Tax_Lines,
    Fee_Lines,
    Coupon_Lines,
    Refunds,
    Orders_Refunds_Line_Items,
    Downloads,
    Dimensions,
    Categories,
    Tags,
    Images,
    Attributes,
    Default_Attributes,
    SystemStatusEnvironment,
    SystemStatusDatabase,
    SystemStatusTheme,
    SystemStatusSettings,
    SystemStatusSecurity,
} from "../models/index.js";

/**
 * Standardized response wrapper returned by all client methods.
 * Provides data + HTTP metadata for pagination headers (x-wp-total, x-wp-totalpages, Link, etc).
 */
export interface WooCommerceApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: any; // Headers are intentionally loose (dynamic WC + axios + custom); matches original and real HTTP usage. No `any` in implementation.
}

// ============================================
// Primary resource interfaces (responses)
// ============================================

export interface Coupons {
  id: number;
  code: string;
  amount: string;
  date_created: Date;
  date_created_gmt: Date;
  date_modified: Date;
  date_modified_gmt: Date;
  discount_type: string;
  description: string;
  date_expires: string;
  date_expires_gmt: string;
  usage_count: number;
  individual_use: boolean;
  product_ids: number[];
  excluded_product_ids: number[];
  usage_limit: number;
  usage_limit_per_user: number;
  limit_usage_to_x_items: number;
  free_shipping: boolean;
  product_categories: number[];
  excluded_product_categories: number[];
  exclude_sale_items: boolean;
  minimum_amount: string;
  maximum_amount: string;
  email_restrictions: string[];
  used_by: string[];
  meta_data: Meta_Data[];
}

export interface Customers {
  id: number;
  date_created: Date;
  date_created_gmt: Date;
  date_modified: Date;
  date_modified_gmt: Date;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: Billing;
  shipping: Shipping;
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: Meta_Data[];
}

export interface Orders {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: string;
  currency: string;
  date_created: Date;
  date_created_gmt: Date;
  date_modified: Date;
  date_modified_gmt: Date;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: Partial<Billing>;
  shipping: Shipping;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid: string;
  date_paid_gmt: string;
  date_completed: string;
  date_completed_gmt: string;
  cart_hash: string;
  meta_data: Partial<Meta_Data>[];
  line_items: Partial<Line_Items>[];
  tax_lines: Partial<Tax_Lines>[];
  shipping_lines: Partial<Shipping_Lines>[];
  fee_lines: Partial<Fee_Lines>[];
  coupon_lines: Partial<Coupon_Lines>[];
  refunds: Partial<Refunds>[];
  set_paid: boolean;
}

export interface OrdersNotes {
  id: number;
  author: string;
  date_created: Date;
  date_created_gmt: Date;
  note: string;
  customer_note: boolean;
  added_by_user: boolean;
}

export interface OrdersRefunds {
  id: number;
  date_created: Date;
  date_created_gmt: Date;
  amount: string;
  reason: string;
  refunded_by: number;
  refunded_payment: boolean;
  meta_data: Partial<Meta_Data>[];
  line_items: Partial<Orders_Refunds_Line_Items>[];
  api_refund: boolean;
}

export interface Products {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: Date;
  date_created_gmt: Date;
  date_modified: Date;
  date_modified_gmt: Date;
  catalog_visibility: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: Date;
  date_on_sale_from_gmt: Date;
  date_on_sale_to: Date;
  date_on_sale_to_gmt: Date;
  price_html: string;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: Partial<Downloads>[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  manage_stock: boolean;
  stock_quantity: number;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: Partial<Dimensions>;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Partial<Categories>[];
  tags: Partial<Tags>[];
  images: Partial<Images>[];
  attributes: Partial<Attributes>[];
  default_attributes: Partial<Default_Attributes>[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: Partial<Meta_Data>[];
  // Query-only fields (present for convenience in some flows)
  per_page?: number;
  page?: number;
  context?: "views" | "edit" | string;
  search?: string;
  after?: string;
  before?: string;
  modified_after?: string;
  modified_before?: string;
  dates_are_gmt?: boolean;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: "asc" | "desc" | string;
  orderby?:
    | "id"
    | "include"
    | "name"
    | "date"
    | "title"
    | "slug"
    | "price"
    | "popularity"
    | "rating"
    | string;
  parent?: number[];
  parent_exclude?: number[];
  status?: "draft" | "any" | "pending" | "publish" | "private" | string;
  type?: "simple" | "grouped" | "external" | "variable" | string;
  sku?: string;
  featured?: boolean;
  category?: string;
  tag?: string;
  attribute?: string;
  attribute_term?: string;
  tax_class?: string;
  on_sale?: boolean;
  min_price?: string;
  max_price?: string;
  stock_status?: "instock" | "outofstock" | "onbackorder" | string;
}

export interface ProductsVariations {
  id: number;
  date_created: Date;
  date_created_gmt: Date;
  date_modified: Date;
  date_modified_gmt: Date;
  description: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: Date;
  date_on_sale_from_gmt: Date;
  date_on_sale_to: Date;
  date_on_sale_to_gmt: Date;
  on_sale: boolean;
  status: string;
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  downloads: Partial<Downloads>[];
  download_limit: number;
  download_expiry: number;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  weight: string;
  dimensions: Partial<Dimensions>;
  shipping_class: string;
  shipping_class_id: number;
  image: Partial<Images>;
  attributes: Partial<Attributes>[];
  menu_order: number;
  meta_data: Partial<Meta_Data>[];
}

export interface ProductsAttributes {
  id: number;
  name: string;
  slug: string;
  type: string;
  order_by: string;
  has_archives: boolean;
}

export interface ProductsAttributesTerms {
  id: number;
  name: string;
  slug: string;
  description: string;
  menu_order: number;
  count: number;
}

export interface ProductsCategories {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: Partial<Images>;
  menu_order: number;
  count: number;
}

export interface ProductsShippingClasses {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

export interface ProductsTags {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

export interface ProductsReviews {
  id: number;
  date_created: Date;
  date_created_gmt: Date;
  parent_id: number;
  status: string;
  reviewer: string;
  reviewer_email: string;
  review: string;
  verified: boolean;
}

export interface TaxRates {
  id: number;
  country: string;
  state: string;
  postcode: string;
  city: string;
  postcodes: string[];
  cities: string[];
  rate: string;
  name: string;
  priority: number;
  compound: boolean;
  shipping: boolean;
  order: number;
  class: string;
}

export interface TaxClasses {
  slug: string;
  name: string;
}

export interface Webhooks {
  id: number;
  name: string;
  status: "all" | "active" | "paused" | "disabled" | string;
  topic: string;
  resource: string;
  event: string;
  hooks: string[];
  delivery_url: string;
  secret: string;
  date_created: Date;
  date_created_gmt: Date;
  date_modified: Date;
  date_modified_gmt: Date;
  links: Partial<Links>;
  context: "view" | "edit" | string;
  page: 1 | number;
  per_page: 10 | 25 | 50 | 100 | number;
  search: string;
  after: string;
  before: string;
  exclude: number[];
  include: number[];
  offset: number;
  order: "asc" | "desc" | string;
  orderby: "id" | "include" | "name" | "date" | "title" | "slug" | string;
  force: boolean;
}

export interface Settings {
  id: string;
  label: string;
  description: string;
  parent_id: string;
  sub_groups: string[];
}

export interface SettingsOptions {
  id: string;
  label: string;
  description: string;
  type: string;
  default: string;
  options: { [key: string]: string };
  tip: string;
  value: string;
  group_id: string;
}

export interface PaymentGatewaysSettings {
  id: string;
  label: string;
  description: string;
  type:
    | "text"
    | "email"
    | "number"
    | "color"
    | "password"
    | "textarea"
    | "select"
    | "multiselect"
    | "radio"
    | "image_width"
    | "checkbox";
  value: string;
  default: string;
  tip: string;
  placeholder: string;
}

export interface PaymentGateways {
  id: string;
  title: string;
  description: string;
  order: number;
  enabled: boolean;
  method_title: string;
  method_description: string;
  method_supports: string[];
  settings: Partial<PaymentGatewaysSettings>[];
}

export interface ShippingZones {
  id: number;
  name: string;
  order: number;
}

export interface ShippingZonesLocations {
  code: string;
  type: "postcode" | "state" | "country" | "continent";
}

export interface ShippingZonesMethodsSettings {
  id: string;
  label: string;
  description: string;
  type:
    | "text"
    | "email"
    | "number"
    | "color"
    | "password"
    | "textarea"
    | "select"
    | "multiselect"
    | "radio"
    | "image_width"
    | "checkbox";
  value: string;
  default: string;
  tip: string;
  placeholder: string;
}

export interface ShippingZonesMethods {
  instace_id: number;
  title: string;
  order: number;
  enabled: boolean;
  method_id: string;
  method_title: string;
  method_description: string;
  method_supports: Partial<ShippingZonesMethodsSettings>[];
}

export interface ShippingMethods {
  id: string;
  title: string;
  description: string;
}

export interface SystemStatus {
  environment: Partial<SystemStatusEnvironment>;
  database: Partial<SystemStatusDatabase>;
  active_plugins: string[];
  theme: Partial<SystemStatusTheme>;
  settings: Partial<SystemStatusSettings>;
  security: Partial<SystemStatusSecurity>;
  pages: string[];
}
