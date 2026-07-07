/**
 * WooCommerce entity models / data shapes.
 * Moved from monolithic typesANDinterfaces.ts for separation of concerns.
 * These are representative interfaces matching the WC REST API responses (v3).
 * They are intentionally loose/Partial-friendly for real-world usage and partial updates.
 */

export type Meta_Data = {
  id: number;
  key: string;
  value: string | number | boolean | object | null;
};

export type Links = {
  self: Array<{ href: string }>;
  collection: Array<{ href: string }>;
  up?: Array<{ href: string }>;
};

export type Billing = {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
};

export type Shipping = {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

export type Taxes = {
  id: number;
  rate_code: string;
  rate_id: number;
  label: string;
  compound: boolean;
  tax_total: string;
  shipping_tax_total: string;
  meta_data?: Meta_Data[];
};

export type Shipping_Lines = {
  id?: number;
  method_title: string;
  method_id: string | number;
  total: string;
  total_tax: string;
  taxes?: Taxes[];
  meta_data?: Meta_Data[];
};

export type Line_Items = {
  id?: number;
  name: string;
  product_id: number;
  variation_id?: number;
  quantity: number;
  tax_class?: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes?: Taxes[];
  meta_data?: Meta_Data[];
  sku?: string;
  price?: number | string;
};

export type Tax_Lines = {
  id?: number;
  rate_code: string;
  rate_id: number;
  label: string;
  compound: boolean;
  tax_total: string;
  shipping_tax_total: string;
  meta_data?: Partial<Meta_Data>[];
};

export type Fee_Lines = {
  id?: number;
  name: string;
  tax_class?: string;
  tax_status?: string;
  total: string;
  total_tax: string;
  taxes?: Partial<Taxes>[];
  meta_data?: Partial<Meta_Data>[];
};

export type Coupon_Lines = {
  id?: number;
  code: string;
  discount: string;
  discount_tax: string;
  meta_data?: Partial<Meta_Data>[];
};

export type Refunds = {
  id?: number;
  reason?: string;
  total?: string;
};

export type Orders_Refunds_Line_Items = Partial<Line_Items> & { refund_total?: number };

export type Downloads = {
  id?: number;
  name: string;
  file: string;
};

export type Dimensions = {
  length: string;
  width: string;
  height: string;
};

export type Categories = { id: number; name: string; slug: string };
export type Tags = { id: number; name: string; slug: string };

export type Images = {
  id?: number;
  date_created?: string | Date;
  date_created_gmt?: string | Date;
  date_modified?: string | Date;
  date_modified_gmt?: string | Date;
  src: string;
  name?: string;
  alt?: string;
};

export type Attributes = {
  id?: number;
  name: string;
  position?: number;
  visible?: boolean;
  variation?: boolean;
  options: string[];
};

export type Default_Attributes = { id?: number; name: string; option: string };

export type SystemStatusEnvironment = {
  home_url: string;
  site_url: string;
  wc_version: string;
  log_directory?: string;
  log_directory_writable?: boolean;
  wp_version: string;
  wp_multisite?: boolean;
  wp_memory_limit?: number;
  wp_debug_mode?: boolean;
  wp_cron?: boolean;
  language?: string;
  server_info?: string;
  php_version?: string;
  php_post_max_size?: number;
  php_max_execution_time?: number;
  php_max_input_vars?: number;
  curl_version?: string;
  suhosin_installed?: boolean;
  max_upload_size?: number;
  mysql_version?: string;
  default_timezone?: string;
  fsockopen_or_curl_enabled?: boolean;
  soapclient_enabled?: boolean;
  domdocument_enabled?: boolean;
  gzip_enabled?: boolean;
  mbstring_enabled?: boolean;
  remote_post_successful?: boolean;
  remote_post_response?: string;
  remote_get_successful?: boolean;
  remote_get_response?: string;
};

export type SystemStatusDatabase = {
  wc_database_version?: string;
  database_prefix?: string;
  maxmind_geoip_database?: string;
  database_tables?: string[];
};

export type SystemStatusTheme = {
  name?: string;
  version?: string;
  version_latest?: string;
  author_url?: string;
  is_child_theme?: boolean;
  parent_theme_name?: string;
  has_woocommerce_support?: boolean;
  has_woocommerce_file?: boolean;
  has_outdated_templates?: boolean;
  overrides?: string[];
  parent_name?: string;
  parent_version?: string;
  parent_author_url?: string;
};

export type SystemStatusSettings = {
  api_enabled?: boolean;
  force_ssl?: boolean;
  currency?: string;
  currency_symbol?: string;
  currency_position?: string;
  thousand_separator?: string;
  decimal_separator?: string;
  number_of_decimals?: number;
  geolocate_enabled?: boolean;
  taxnomies?: string[];
};

export type SystemStatusSecurity = {
  secure_connection?: boolean;
  hide_errors?: boolean;
};

export interface Coupons {
  id?: number;
  code: string;
  amount: string;
  date_created?: string | Date;
  date_created_gmt?: string | Date;
  date_modified?: string | Date;
  date_modified_gmt?: string | Date;
  discount_type?: string;
  description?: string;
  date_expires?: string;
  date_expires_gmt?: string;
  usage_count?: number;
  individual_use?: boolean;
  product_ids?: number[];
  excluded_product_ids?: number[];
  usage_limit?: number;
  usage_limit_per_user?: number;
  limit_usage_to_x_items?: number;
  free_shipping?: boolean;
  product_categories?: number[];
  excluded_product_categories?: number[];
  exclude_sale_items?: boolean;
  minimum_amount?: string;
  maximum_amount?: string;
  email_restrictions?: string[];
  used_by?: string[];
  meta_data?: Meta_Data[];
}

export interface Customers {
  id?: number;
  date_created?: string | Date;
  date_created_gmt?: string | Date;
  date_modified?: string | Date;
  date_modified_gmt?: string | Date;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  username?: string;
  billing?: Partial<Billing>;
  shipping?: Partial<Shipping>;
  is_paying_customer?: boolean;
  avatar_url?: string;
  meta_data?: Meta_Data[];
}

export interface Orders {
  id?: number;
  parent_id?: number;
  number?: string;
  order_key?: string;
  created_via?: string;
  version?: string;
  status?: string;
  currency?: string;
  date_created?: string | Date;
  date_created_gmt?: string | Date;
  date_modified?: string | Date;
  date_modified_gmt?: string | Date;
  discount_total?: string;
  discount_tax?: string;
  shipping_total?: string;
  shipping_tax?: string;
  cart_tax?: string;
  total?: string;
  total_tax?: string;
  prices_include_tax?: boolean;
  customer_id?: number;
  customer_ip_address?: string;
  customer_user_agent?: string;
  customer_note?: string;
  billing?: Partial<Billing>;
  shipping?: Partial<Shipping>;
  payment_method?: string;
  payment_method_title?: string;
  transaction_id?: string;
  date_paid?: string | Date;
  date_paid_gmt?: string | Date;
  date_completed?: string | Date;
  date_completed_gmt?: string | Date;
  cart_hash?: string;
  meta_data?: Partial<Meta_Data>[];
  line_items?: Partial<Line_Items>[];
  tax_lines?: Partial<Tax_Lines>[];
  shipping_lines?: Partial<Shipping_Lines>[];
  fee_lines?: Partial<Fee_Lines>[];
  coupon_lines?: Partial<Coupon_Lines>[];
  refunds?: Partial<Refunds>[];
  set_paid?: boolean;
}

export interface OrdersNotes {
  id?: number;
  author?: string;
  date_created?: string | Date;
  date_created_gmt?: string | Date;
  note?: string;
  customer_note?: boolean;
  added_by_user?: boolean;
}

export interface OrdersRefunds {
  id?: number;
  date_created?: string | Date;
  date_created_gmt?: string | Date;
  amount?: string;
  reason?: string;
  refunded_by?: number;
  refunded_payment?: boolean;
  meta_data?: Partial<Meta_Data>[];
  line_items?: Partial<Orders_Refunds_Line_Items>[];
  api_refund?: boolean;
}

export interface Products {
  id?: number;
  name: string;
  slug?: string;
  permalink?: string;
  date_created?: string | Date;
  date_created_gmt?: string | Date;
  date_modified?: string | Date;
  date_modified_gmt?: string | Date;
  catalog_visibility?: string;
  description?: string;
  short_description?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  date_on_sale_from?: string | Date;
  date_on_sale_from_gmt?: string | Date;
  date_on_sale_to?: string | Date;
  date_on_sale_to_gmt?: string | Date;
  price_html?: string;
  purchasable?: boolean;
  total_sales?: number;
  virtual?: boolean;
  downloadable?: boolean;
  downloads?: Partial<Downloads>[];
  download_limit?: number;
  download_expiry?: number;
  external_url?: string;
  button_text?: string;
  tax_status?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  backorders?: string;
  backorders_allowed?: boolean;
  backordered?: boolean;
  sold_individually?: boolean;
  weight?: string;
  dimensions?: Partial<Dimensions>;
  shipping_required?: boolean;
  shipping_taxable?: boolean;
  shipping_class?: string;
  shipping_class_id?: number;
  reviews_allowed?: boolean;
  average_rating?: string;
  rating_count?: number;
  related_ids?: number[];
  upsell_ids?: number[];
  cross_sell_ids?: number[];
  parent_id?: number;
  purchase_note?: string;
  categories?: Partial<Categories>[];
  tags?: Partial<Tags>[];
  images?: Partial<Images>[];
  attributes?: Partial<Attributes>[];
  default_attributes?: Partial<Default_Attributes>[];
  variations?: number[];
  grouped_products?: number[];
  menu_order?: number;
  meta_data?: Partial<Meta_Data>[];
  // query helpers often present in request contexts
  per_page?: number;
  page?: number;
  context?: "view" | "edit" | string;
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
  orderby?: "id" | "include" | "name" | "date" | "title" | "slug" | "price" | "popularity" | "rating" | string;
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
  id?: number;
  date_created?: string | Date;
  date_created_gmt?: string | Date;
  date_modified?: string | Date;
  date_modified_gmt?: string | Date;
  description?: string;
  permalink?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  date_on_sale_from?: string | Date;
  date_on_sale_from_gmt?: string | Date;
  date_on_sale_to?: string | Date;
  date_on_sale_to_gmt?: string | Date;
  on_sale?: boolean;
  status?: string;
  purchasable?: boolean;
  virtual?: boolean;
  downloadable?: boolean;
  downloads?: Partial<Downloads>[];
  download_limit?: number;
  download_expiry?: number;
  tax_status?: string;
  tax_class?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  stock_status?: string;
  backorders?: string;
  backorders_allowed?: boolean;
  backordered?: boolean;
  weight?: string;
  dimensions?: Partial<Dimensions>;
  shipping_class?: string;
  shipping_class_id?: number;
  image?: Partial<Images>;
  attributes?: Partial<Attributes>[];
  menu_order?: number;
  meta_data?: Partial<Meta_Data>[];
}

export interface ProductsAttributes {
  id?: number;
  name: string;
  slug?: string;
  type?: string;
  order_by?: string;
  has_archives?: boolean;
}

export interface ProductsAttributesTerms {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  menu_order?: number;
  count?: number;
}

export interface ProductsCategories {
  id?: number;
  name: string;
  slug?: string;
  parent?: number;
  description?: string;
  display?: string;
  image?: Partial<Images>;
  menu_order?: number;
  count?: number;
}

export interface ProductsShippingClasses {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  count?: number;
}

export interface ProductsTags {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  count?: number;
}

export interface ProductsReviews {
  id?: number;
  date_created?: string | Date;
  date_created_gmt?: string | Date;
  parent_id?: number;
  status?: string;
  reviewer?: string;
  reviewer_email?: string;
  review?: string;
  verified?: boolean;
}

export interface TaxRates {
  id?: number;
  country: string;
  state?: string;
  postcode?: string;
  city?: string;
  postcodes?: string[];
  cities?: string[];
  rate: string;
  name: string;
  priority?: number;
  compound?: boolean;
  shipping?: boolean;
  order?: number;
  class?: string;
}

export interface TaxClasses { slug: string; name: string; }

export interface Webhooks {
  id?: number;
  name: string;
  status?: "all" | "active" | "paused" | "disabled" | string;
  topic: string;
  resource?: string;
  event?: string;
  hooks?: string[];
  delivery_url: string;
  secret?: string;
  date_created?: string | Date;
  date_created_gmt?: string | Date;
  date_modified?: string | Date;
  date_modified_gmt?: string | Date;
  links?: Partial<Links>;
  context?: "view" | "edit" | string;
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: string;
  orderby?: string;
  force?: boolean;
}

export interface Settings {
  id: string;
  label?: string;
  description?: string;
  parent_id?: string;
  sub_groups?: string[];
}

export interface SettingsOptions {
  id: string;
  label?: string;
  description?: string;
  type?: string;
  default?: string;
  options?: Record<string, string>;
  tip?: string;
  value?: string;
  group_id?: string;
}

export interface PaymentGatewaysSettings {
  id: string;
  label?: string;
  description?: string;
  type?: "text" | "email" | "number" | "color" | "password" | "textarea" | "select" | "multiselect" | "radio" | "image_width" | "checkbox";
  value?: string;
  default?: string;
  tip?: string;
  placeholder?: string;
}

export interface PaymentGateways {
  id: string;
  title: string;
  description?: string;
  order?: number;
  enabled?: boolean;
  method_title?: string;
  method_description?: string;
  method_supports?: string[];
  settings?: Partial<PaymentGatewaysSettings>[];
}

export interface ShippingZones { id?: number; name: string; order?: number; }
export interface ShippingZonesLocations { code: string; type: "postcode" | "state" | "country" | "continent"; }
export type ShippingZonesMethodsSettings = PaymentGatewaysSettings;
export interface ShippingZonesMethods {
  /**
   * @deprecated Typo retained for backward compatibility. Prefer `instance_id`.
   */
  instace_id?: number;
  /** Shipping zone method instance id (correct spelling). */
  instance_id?: number;
  title: string;
  order?: number;
  enabled?: boolean;
  method_id: string;
  method_title?: string;
  method_description?: string;
  method_supports?: Partial<ShippingZonesMethodsSettings>[];
}
export interface ShippingMethods { id: string; title: string; description?: string; }

export interface SystemStatus {
  environment?: Partial<SystemStatusEnvironment>;
  database?: Partial<SystemStatusDatabase>;
  active_plugins?: string[];
  theme?: Partial<SystemStatusTheme>;
  settings?: Partial<SystemStatusSettings>;
  security?: Partial<SystemStatusSecurity>;
  pages?: string[];
}

export type DELETE = {
  id: number | string;
  force?: boolean | string;
};
