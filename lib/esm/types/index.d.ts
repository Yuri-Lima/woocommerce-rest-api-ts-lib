import { AxiosRequestConfig } from "axios";
import OAuth from "oauth-1.0a";
import {
  WooRestApiMethod,
  IWooRestApiQuery,
  IWooRestApiOptions,
  WooRestApiEndpoint,
  OrdersMainParams,
  ProductsMainParams,
  SystemStatusParams,
  CouponsParams,
  CustomersParams,
} from "./types.js";
type WooRestApiOptions = IWooRestApiOptions<AxiosRequestConfig>;
type WooRestApiParams = CouponsParams &
  CustomersParams &
  OrdersMainParams &
  ProductsMainParams &
  SystemStatusParams;
export default class WooCommerceRestApi<T extends WooRestApiOptions> {
  protected _opt: T;
  constructor(opt: T);
  _setDefaultsOptions(opt: T): void;
  _parseParamsObject<T>(
    params: Record<string, T>,
    query: Record<string, any>
  ): IWooRestApiQuery;
  _normalizeQueryString(url: string, params: Record<string, any>): string;
  _getUrl(endpoint: string, params: Record<string, unknown>): string;
  _getOAuth(): OAuth;
  _request(
    method: WooRestApiMethod,
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<any>;
  get<T extends WooRestApiEndpoint>(
    endpoint: T,
    params: WooRestApiParams
  ): Promise<any>;
  post<T extends WooRestApiEndpoint>(
    endpoint: T,
    data: Record<string, unknown>,
    params?: WooRestApiParams
  ): Promise<any>;
  put<T extends WooRestApiEndpoint>(
    endpoint: T,
    data: Record<string, unknown>,
    params?: WooRestApiParams
  ): Promise<any>;
  delete<T extends WooRestApiEndpoint>(
    endpoint: T,
    params?: WooRestApiParams
  ): Promise<any>;
  options<T extends WooRestApiEndpoint>(
    endpoint: T,
    params?: WooRestApiParams
  ): Promise<any>;
}
export declare class OptionsException {
  name: "Options Error";
  message: string;
  constructor(message: string);
}
export {};
//# sourceMappingURL=index.d.ts.map
