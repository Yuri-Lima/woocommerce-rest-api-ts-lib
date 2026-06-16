import type {
    Coupons,
    Customers,
    Orders,
    OrdersNotes,
    OrdersRefunds,
    Products,
    ProductsVariations,
    ProductsAttributes,
    ProductsAttributesTerms,
    ProductsCategories,
    ProductsShippingClasses,
    ProductsTags,
    ProductsReviews,
    TaxRates,
    TaxClasses,
    Webhooks,
    Settings,
    SettingsOptions,
    PaymentGateways,
    PaymentGatewaysSettings,
    ShippingZones,
    ShippingZonesLocations,
    ShippingZonesMethods,
    ShippingMethods,
    SystemStatus,
} from "../responses/index.js";

/* DELETE helper for force-delete semantics */
export interface DELETE {
  id: number | string;
  force?: boolean | string;
}

/* Params = Partial<entity> for query/filter bodies (temporary loose mapping) */

export type CouponsParams = Partial<Coupons>;
export type CustomersParams = Partial<Customers>;

export type OrdersParams = Partial<Orders>;
export type OrdersNotesParams = Partial<OrdersNotes>;
export type OrdersRefundsParams = Partial<OrdersRefunds>;

/** Union for all order-related query/body shapes */
export type OrdersMainParams = OrdersParams & OrdersNotesParams & OrdersRefundsParams;

// Products
type ProductsParams = Partial<Products>;
type ProductsVariationsParams = Partial<ProductsVariations>;
type ProductsAttributesParams = Partial<ProductsAttributes>;
type ProductsAttributesTermsParams = Partial<ProductsAttributesTerms>;
type ProductsCategoriesParams = Partial<ProductsCategories>;
type ProductsShippingClassesParams = Partial<ProductsShippingClasses>;
type ProductsTagsParams = Partial<ProductsTags>;
type ProductsReviewsParams = Partial<ProductsReviews>;

/** Union for product-related operations (note: some prior intersections were overly complex) */
export type ProductsMainParams =
  | (ProductsParams & ProductsVariationsParams & ProductsAttributesParams)
  | ProductsAttributesTermsParams
  | ProductsCategoriesParams
  | ProductsShippingClassesParams
  | ProductsTagsParams
  | ProductsReviewsParams;

// Tax
export type TaxRatesParams = Partial<TaxRates>;
export type TaxClassesParams = Partial<TaxClasses>;

// Settings
export type SettingsParams = Partial<Settings>;
export type SettingsOptionsParams = Partial<SettingsOptions>;

// Payment
export type PaymentGatewaysParams = Partial<PaymentGateways>;
export type PaymentGatewaysSettingsParams = Partial<PaymentGatewaysSettings>;

// Shipping
export type ShippingZonesParams = Partial<ShippingZones>;
export type ShippingZonesLocationsParams = Partial<ShippingZonesLocations>;
export type ShippingZonesMethodsParams = Partial<ShippingZonesMethods>;
export type ShippingMethodsParams = Partial<ShippingMethods>;

// System
export type SystemStatusParams = Partial<SystemStatus>;

// Webhooks
export type WebhooksParams = Partial<Webhooks>;
