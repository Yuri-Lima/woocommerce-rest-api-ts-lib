// ============================================
// Shared sub-models used across entities
// ============================================

export type Meta_Data = {
  id: number;
  key: string;
  value: string;
};

export type Links = {
  self: Array<{ href: string }>;
  collection: Array<{ href: string }>;
  up: Array<{ href: string }>;
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
  meta_data: Meta_Data;
};

export type Shipping_Lines = {
  id: number;
  method_title: string;
  method_id: string;
  total: string;
  total_tax: string;
  taxes: Taxes[];
  meta_data: Meta_Data;
};

export type Line_Items = {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes: Taxes[];
  meta_data: Meta_Data;
  sku: string;
  price: number;
};

export type Tax_Lines = {
  id: number;
  rate_code: string;
  rate_id: number;
  label: string;
  compound: boolean;
  tax_total: string;
  shipping_tax_total: string;
  meta_data: Partial<Meta_Data>;
};

export type Fee_Lines = {
  id: number;
  name: string;
  tax_class: string;
  tax_status: string;
  total: string;
  total_tax: string;
  taxes: Partial<Taxes>[];
  meta_data: Partial<Meta_Data>;
};

export type Coupon_Lines = {
  id: number;
  code: string;
  discount: string;
  discount_tax: string;
  meta_data: Partial<Meta_Data>;
};

export type Refunds = {
  id: number;
  reason: string;
  total: string;
};

export type Orders_Refunds_Lines = {
  id: number;
  total: string;
  subtotal: string;
  refund_total: number;
};

export type Orders_Refunds_Line_Items = {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes: Partial<Orders_Refunds_Lines>[];
  meta_data: Partial<Meta_Data>[];
  sku: string;
  price: string;
  refund_total: number;
};

export type Downloads = {
  id: number;
  name: string;
  file: string;
};

export type Dimensions = {
  length: string;
  width: string;
  height: string;
};

export type Categories = {
  id: number;
  name: string;
  slug: string;
};

export type Tags = {
  id: number;
  name: string;
  slug: string;
};

export type Images = {
  id: number;
  date_created: Date;
  date_created_gmt: Date;
  date_modified: Date;
  date_modified_gmt: Date;
  src: string;
  name: string;
  alt: string;
};

export type Attributes = {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
};

export type Default_Attributes = {
  id: number;
  name: string;
  option: string;
};

// ============================================
// System Status sub-models
// ============================================

export type SystemStatusEnvironment = {
  home_url: string;
  site_url: string;
  wc_version: string;
  log_directory: string;
  log_directory_writable: boolean;
  wp_version: string;
  wp_multisite: boolean;
  wp_memory_limit: number;
  wp_debug_mode: boolean;
  wp_cron: boolean;
  language: string;
  server_info: string;
  php_version: string;
  php_post_max_size: number;
  php_max_execution_time: number;
  php_max_input_vars: number;
  curl_version: string;
  suhosin_installed: boolean;
  max_upload_size: number;
  mysql_version: string;
  default_timezone: string;
  fsockopen_or_curl_enabled: boolean;
  soapclient_enabled: boolean;
  domdocument_enabled: boolean;
  gzip_enabled: boolean;
  mbstring_enabled: boolean;
  remote_post_successful: boolean;
  remote_post_response: string;
  remote_get_successful: boolean;
  remote_get_response: string;
};

export type SystemStatusDatabase = {
  wc_database_version: string;
  database_prefix: string;
  maxmind_geoip_database: string;
  database_tables: string[];
};

export type SystemStatusTheme = {
  name: string;
  version: string;
  version_latest: string;
  author_url: string;
  is_child_theme: boolean;
  parent_theme_name: string;
  has_woocommerce_support: boolean;
  has_woocommerce_file: boolean;
  has_outdated_templates: boolean;
  overrides: string[];
  parent_name: string;
  parent_version: string;
  parent_author_url: string;
};

export type SystemStatusSettings = {
  api_enabled: boolean;
  force_ssl: boolean;
  currency: string;
  currency_symbol: string;
  currency_position: string;
  thousand_separator: string;
  decimal_separator: string;
  number_of_decimals: number;
  geolocate_enabled: boolean;
  taxnomies: string[];
};

export type SystemStatusSecurity = {
  secure_connection: boolean;
  hide_errors: boolean;
};
