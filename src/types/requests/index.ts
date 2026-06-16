/**
 * Request / query param types.
 * These are Partial<model> unions used for list/create/update filters.
 */

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
    Settings,
    SettingsOptions,
    PaymentGateways,
    PaymentGatewaysSettings,
    ShippingZones,
    ShippingZonesLocations,
    ShippingZonesMethods,
    ShippingMethods,
    SystemStatus,
    DELETE,
} from "../models";

export type { DELETE }; // re-export shape { id, force? } from models

export type CouponsParams = Partial<Coupons>;
export type CustomersParams = Partial<Customers>;

export type OrdersParams = Partial<Orders>;
export type OrdersNotesParams = Partial<OrdersNotes>;
export type OrdersRefundsParams = Partial<OrdersRefunds>;
export type OrdersMainParams = OrdersParams & OrdersNotesParams & OrdersRefundsParams;

type ProductsParams = Partial<Products>;
type ProductsVariationsParams = Partial<ProductsVariations>;
type ProductsAttributesParams = Partial<ProductsAttributes>;
type ProductsAttributesTermsParams = Partial<ProductsAttributesTerms>;
type ProductsCategoriesParams = Partial<ProductsCategories>;
type ProductsShippingClassesParams = Partial<ProductsShippingClasses>;
type ProductsTagsParams = Partial<ProductsTags>;
type ProductsReviewsParams = Partial<ProductsReviews>;

export type ProductsMainParams =
  | (ProductsParams & ProductsVariationsParams & ProductsAttributesParams)
  | ProductsAttributesTermsParams
  | ProductsCategoriesParams
  | ProductsShippingClassesParams
  | ProductsTagsParams
  | ProductsReviewsParams;

export type TaxRatesParams = Partial<TaxRates>;
export type TaxClassesParams = Partial<TaxClasses>;

export type SettingsParams = Partial<Settings>;
export type SettingsOptionsParams = Partial<SettingsOptions>;

export type PaymentGatewaysParams = Partial<PaymentGateways>;
export type PaymentGatewaysSettingsParams = Partial<PaymentGatewaysSettings>;

export type ShippingZonesParams = Partial<ShippingZones>;
export type ShippingZonesLocationsParams = Partial<ShippingZonesLocations>;
export type ShippingZonesMethodsParams = Partial<ShippingZonesMethods>;
export type ShippingMethodsParams = Partial<ShippingMethods>;

export type SystemStatusParams = Partial<SystemStatus>;

export type WebhooksParams = Partial<import("../models").Webhooks>;

export type WooRestApiParams =
  & CouponsParams
  & CustomersParams
  & OrdersMainParams
  & ProductsMainParams
  & SystemStatusParams
  & (DELETE extends infer D ? D : never);
