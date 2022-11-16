import OAuth from "oauth-1.0a";
import { WooCommerceRestApiVersion, WooCommerceRestApiEncoding, WooCommerceRestApiMethod, IWooCommerceRestApiOptions } from "./types";
export default class WooCommerceRestApi {
    protected classVersion: string;
    protected url: string;
    protected consumerKey: string;
    protected consumerSecret: string;
    protected wpAPIPrefix: string;
    protected version: WooCommerceRestApiVersion;
    protected encoding: WooCommerceRestApiEncoding;
    protected queryStringAuth: boolean;
    protected port: number | string;
    protected timeout: number;
    protected axiosConfig: any;
    protected isHttps: boolean;
    constructor(opt: IWooCommerceRestApiOptions);
    _setDefaultsOptions(opt: IWooCommerceRestApiOptions): void;
    _parseParamsObject(params: any, query: any): any;
    _normalizeQueryString(url: string, params?: any): string;
    _getUrl(endpoint: string, params: Record<string, unknown>): string;
    _getOAuth(): OAuth;
    _request(method: WooCommerceRestApiMethod, endpoint: string, data: Record<string, unknown>, params?: Record<string, unknown>): Promise<any>;
    get(endpoint: string, params?: Record<string, unknown>): Promise<any>;
    post(endpoint: string, data: Record<string, unknown>, params?: Record<string, unknown>): Promise<any>;
    put(endpoint: string, data: Record<string, unknown>, params?: Record<string, unknown>): Promise<any>;
    delete(endpoint: string, params?: Record<string, unknown>): Promise<any>;
    options(endpoint: string, params?: Record<string, unknown>): Promise<any>;
}
export declare class OptionsException {
    name: "Options Error";
    message: string;
    constructor(message: string);
}
//# sourceMappingURL=index.d.ts.map