import { AxiosRequestConfig, RawAxiosRequestHeaders } from "axios";
export declare type WooRestApiVersion = "wc/v3" | "wc/v2" | "wc/v1" | "wc-api/v3" | "wc-api/v2" | "wc-api/v1";
export declare type WooRestApiEncoding = "utf-8" | "ascii";
export declare type WooRestApiMethod = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
export interface IWooRestApiOptions extends AxiosRequestConfig {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    wpAPIPrefix?: string;
    version?: WooRestApiVersion;
    encoding?: WooRestApiEncoding;
    queryStringAuth?: boolean;
    port?: number;
    timeout?: number;
    classVersion?: string;
    isHttps?: boolean;
}
export interface IWooRestApiHeaders extends RawAxiosRequestHeaders {
    "Content-Type": string;
}
export interface IWooRestApiQuery {
    [key: string]: string;
}
//# sourceMappingURL=interfaces-types.d.ts.map