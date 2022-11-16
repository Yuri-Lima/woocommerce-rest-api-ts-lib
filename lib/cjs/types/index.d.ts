import OAuth from "oauth-1.0a";
import {
  WooRestApiVersion,
  WooRestApiEncoding,
  WooRestApiMethod,
  IWooRestApiOptions,
  IWooRestApiQuery,
  IWooCredentials,
} from "./types.js";
export default class WooCommerceRestApi {
  protected classVersion: string;
  protected url: string;
  protected credentials: IWooCredentials;
  protected wpAPIPrefix: string;
  protected version: WooRestApiVersion;
  protected encoding: WooRestApiEncoding;
  protected queryStringAuth: boolean;
  protected port: number | string;
  protected timeout: number;
  protected axiosConfig: any;
  protected isHttps: boolean;
  constructor(opt: IWooRestApiOptions);
  _setDefaultsOptions(opt: IWooRestApiOptions): void;
  _parseParamsObject(
    params: Record<string, any>,
    query: Record<string, any>
  ): IWooRestApiQuery;
  _normalizeQueryString(
    url: string,
    params: {
      [key: string]: any;
    }
  ): string;
  _getUrl(endpoint: string, params: Record<string, unknown>): string;
  _getOAuth(): OAuth;
  _request(
    method: WooRestApiMethod,
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<any>;
  get(endpoint: string, params?: Record<string, unknown>): Promise<any>;
  post(
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<any>;
  put(
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<any>;
  delete(endpoint: string, params?: Record<string, unknown>): Promise<any>;
  options(endpoint: string, params?: Record<string, unknown>): Promise<any>;
}
export declare class OptionsException {
  name: "Options Error";
  message: string;
  constructor(message: string);
}
//# sourceMappingURL=index.d.ts.map
