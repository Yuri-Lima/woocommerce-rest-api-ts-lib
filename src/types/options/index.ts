/**
 * Options and core configuration types.
 * Separated per the architecture requirement (src/types/options).
 */

import type { AxiosRequestConfig } from "axios"; // for the generic extension point

export type WooRestApiVersion = "wc/v3";

export type WooRestApiEncoding = "utf-8" | "ascii";

export type IWooCredentials = {
  consumerKey: string;
  consumerSecret: string;
};

export interface IWooRestApiOptions<T = unknown> extends IWooCredentials {
  url: string;
  wpAPIPrefix?: string;
  version?: WooRestApiVersion;
  encoding?: WooRestApiEncoding;
  queryStringAuth?: boolean;
  port?: number;
  timeout?: number;
  axiosConfig?: T;
  classVersion?: string;
  isHttps?: boolean;
  maxContentLength?: number;
  maxBodyLength?: number;
  maxConcurrentRequests?: number;
  retryConfig?: {
    retries?: number;
    retryDelay?: number;
    retryOn?: number[];
  };
}

export type WooRestApiOptions = IWooRestApiOptions<AxiosRequestConfig>;

export interface WooCommerceApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string | string[] | number | undefined>;
}
