import { AxiosRequestConfig } from "axios";
import OAuth from "oauth-1.0a";
import {
  WooRestApiMethod,
  IWooRestApiOptions,
  WooRestApiEndpoint,
  OrdersMainParams,
  ProductsMainParams,
  SystemStatusParams,
  CouponsParams,
  CustomersParams,
  DELETE,
  Orders,
  Products,
  Customers,
  Coupons,
  SystemStatus,
} from "./typesANDinterfaces.js";
export {
  WooRestApiMethod,
  IWooRestApiQuery,
  IWooRestApiOptions,
  WooRestApiEndpoint,
  OrdersMainParams,
  ProductsMainParams,
  SystemStatusParams,
  CouponsParams,
  CustomersParams,
  DELETE,
  Orders,
  Products,
  Customers,
  Coupons,
  SystemStatus,
} from "./typesANDinterfaces.js";
export type WooRestApiOptions = IWooRestApiOptions<AxiosRequestConfig>;
export type WooRestApiParams = CouponsParams &
  CustomersParams &
  OrdersMainParams &
  ProductsMainParams &
  SystemStatusParams &
  DELETE;
export interface WooCommerceApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
}
export default class WooCommerceRestApi<T extends WooRestApiOptions> {
  protected _opt: T;
  constructor(opt: T);
  _setDefaultsOptions(opt: T): void;
  _normalizeQueryString(
    url: string,
    params: Partial<Record<string, any>>,
  ): string;
  _getUrl(endpoint: string, params: Partial<Record<string, unknown>>): string;
  _getOAuth(): OAuth;
  _request(
    method: WooRestApiMethod,
    endpoint: string,
    data?: Record<string, unknown>,
    params?: Record<string, unknown>,
  ): Promise<any>;
  get<T = any>(
    endpoint: WooRestApiEndpoint,
    params?: Partial<WooRestApiParams>,
  ): Promise<WooCommerceApiResponse<T>>;
  post<T = any>(
    endpoint: WooRestApiEndpoint,
    data: Record<string, unknown>,
    params?: Partial<WooRestApiParams>,
  ): Promise<WooCommerceApiResponse<T>>;
  put<T = any>(
    endpoint: WooRestApiEndpoint,
    data: Record<string, unknown>,
    params?: Partial<WooRestApiParams>,
  ): Promise<WooCommerceApiResponse<T>>;
  delete<T = any>(
    endpoint: WooRestApiEndpoint,
    data: Pick<WooRestApiParams, "force">,
    params: Pick<WooRestApiParams, "id">,
  ): Promise<WooCommerceApiResponse<T>>;
  options<T = any>(
    endpoint: WooRestApiEndpoint,
    params?: Partial<WooRestApiParams>,
  ): Promise<WooCommerceApiResponse<T>>;
  getProducts(
    params?: Record<string, any>,
  ): Promise<WooCommerceApiResponse<Products[]>>;
  getProduct(id: number): Promise<WooCommerceApiResponse<Products>>;
  createProduct(
    productData: Partial<Products>,
  ): Promise<WooCommerceApiResponse<Products>>;
  updateProduct(
    id: number,
    productData: Partial<Products>,
  ): Promise<WooCommerceApiResponse<Products>>;
  getOrders(
    params?: Record<string, any>,
  ): Promise<WooCommerceApiResponse<Orders[]>>;
  getOrder(id: number): Promise<WooCommerceApiResponse<Orders>>;
  createOrder(
    orderData: Partial<Orders>,
  ): Promise<WooCommerceApiResponse<Orders>>;
  getCustomers(
    params?: Partial<CustomersParams>,
  ): Promise<WooCommerceApiResponse<Customers[]>>;
  getCustomer(id: number): Promise<WooCommerceApiResponse<Customers>>;
  getCoupons(
    params?: Partial<CouponsParams>,
  ): Promise<WooCommerceApiResponse<Coupons[]>>;
  getSystemStatus(): Promise<WooCommerceApiResponse<SystemStatus>>;
}
export declare class WooCommerceApiError extends Error {
  statusCode?: number | undefined;
  response?: any | undefined;
  endpoint?: string | undefined;
  constructor(
    message: string,
    statusCode?: number | undefined,
    response?: any | undefined,
    endpoint?: string | undefined,
  );
}
export declare class AuthenticationError extends WooCommerceApiError {
  constructor(message?: string);
}
export declare class OptionsException {
  name: "Options Error";
  message: string;
  constructor(message: string);
}
//# sourceMappingURL=index.d.ts.map
