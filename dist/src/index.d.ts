import OAuth from "oauth-1.0a";
import { WooRestApiMethod, IWooRestApiOptions } from "./interfaces-types";
export default class WooCommerceRestApi {
    protected _opt: IWooRestApiOptions;
    constructor(opt: IWooRestApiOptions);
    _setDefaultsOptions(opt: IWooRestApiOptions): void;
    _parseParamsObject(params: Record<string, any>, query: Record<string, any>): Record<string, any>;
    _normalizeQueryString(url: string, params?: Record<string, any>): string;
    _getUrl(endpoint: string, params: Record<string, unknown>): string;
    _getOAuth(): OAuth;
    _request(method: WooRestApiMethod, endpoint: string, data?: {
        [key: string]: any;
    }, params?: {
        [key: string]: any;
    }): Promise<any>;
    get(endpoint: string, params?: Record<string, unknown>): Promise<any>;
    post(endpoint: string, data: {
        [key: string]: any;
    }, params: {
        [key: string]: any;
    }): Promise<any>;
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