import { AxiosRequestConfig } from "axios";
export declare type WooCommerceRestApiVersion = "wc/v3" | "wc/v2" | "wc/v1" | "wc-api/v3" | "wc-api/v2" | "wc-api/v1";
export declare type WooCommerceRestApiEncoding = "utf-8" | "ascii";
export declare type WooCommerceRestApiMethod = "get" | "post" | "put" | "delete" | "options";
export interface IWooCommerceRestApiOptions extends AxiosRequestConfig {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    wpAPIPrefix?: string;
    version?: WooCommerceRestApiVersion;
    encoding?: WooCommerceRestApiEncoding;
    queryStringAuth?: boolean;
    port?: number;
    timeout?: number;
    axiosConfig?: AxiosRequestConfig;
    classVersion?: string;
}
export interface IWooCommerceRestApiQuery {
    [key: string]: string;
}
//# sourceMappingURL=types.d.ts.map