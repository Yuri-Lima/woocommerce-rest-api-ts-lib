import { AxiosRequestConfig } from "axios";
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
    axiosConfig?: AxiosRequestConfig;
    classVersion?: string;
}
export interface IWooRestApiQuery {
    [key: string]: string;
}
//# sourceMappingURL=types.d.ts.map