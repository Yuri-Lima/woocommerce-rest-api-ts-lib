"use strict";

import axios, { RawAxiosRequestHeaders, AxiosRequestConfig } from "axios";
import crypto from "node:crypto";
import OAuth from "oauth-1.0a";
import Url from "url-parse";
import {
  WooRestApiVersion,
  WooRestApiEncoding,
  WooRestApiMethod,
  IWooRestApiOptions,
  IWooRestApiQuery,
  IWooCredentials,
} from "./types.js"; // Typescript types for the library

/**
 * WooCommerce REST API wrapper
 *
 * @param {Object} opt
 */
export default class WooCommerceRestApi {
  protected classVersion: string;
  protected url: string;
  protected credentials: IWooCredentials = {
    consumerKey: "",
    consumerSecret: "",
  };

  protected wpAPIPrefix: string;
  protected version: WooRestApiVersion;
  protected encoding: WooRestApiEncoding;
  protected queryStringAuth: boolean;
  protected port: number | string;
  protected timeout: number;
  protected axiosConfig: any;
  protected isHttps: boolean;
  /**
   * Class constructor.
   *
   * @param {Object} opt
   */
  constructor(opt: IWooRestApiOptions) {
    if (!(this instanceof WooCommerceRestApi)) {
      return new WooCommerceRestApi(opt);
    }

    opt = opt || {};

    if (!opt.url) {
      throw new OptionsException("url is required");
    }

    if (!opt.consumerKey) {
      throw new OptionsException("consumerKey is required");
    }

    if (!opt.consumerSecret) {
      throw new OptionsException("consumerSecret is required");
    }

    this.classVersion = "1.0.1";
    this._setDefaultsOptions(opt);
  }

  /**
   * Set default options
   *
   * @param {Object} opt
   */
  _setDefaultsOptions(opt: IWooRestApiOptions): void {
    this.url = opt.url;
    this.wpAPIPrefix = opt.wpAPIPrefix || "wp-json";
    this.version = opt.version || "wc/v3";
    this.isHttps = /^https/i.test(this.url);
    this.credentials.consumerKey = opt.consumerKey;
    this.credentials.consumerSecret = opt.consumerSecret;
    this.encoding = opt.encoding || "utf-8";
    this.queryStringAuth = opt.queryStringAuth || false;
    this.port = <number>opt.port || "";
    this.timeout = <number>opt.timeout;
    this.axiosConfig = opt.axiosConfig;
  }

  /**
   * Parse params to object.
   *
   * @param {Object} params
   * @param {Object} query
   * @return {Object} IWooRestApiQuery
   */
  _parseParamsObject(
    params: Record<string, any>,
    query: Record<string, any>
  ): IWooRestApiQuery {
    for (const key in params) {
      if (typeof params[key] === "object") {
        // If the value is an object, loop through it and add it to the query object
        for (const subKey in params[key]) {
          query[key + "[" + subKey + "]"] = params[key][subKey];
        }
      } else {
        query[key] = params[key]; // If the value is not an object, add it to the query object
      }
    }
    return query; // Return the query object
  }

  /**
   * Normalize query string for oAuth 1.0a
   * Depends on the _parseParamsObject method
   *
   * @param  {String} url
   * @param  {Object} params
   *
   * @return {String}
   */
  _normalizeQueryString(url: string, params: { [key: string]: any }): string {
    /**
     * Exit if url and params are not defined
     */
    if (url.indexOf("?") === -1 && Object.keys(params).length === 0) {
      return url;
    }
    const query = new Url(url, true).query; // Parse the query string returned by the url
    const values = [];

    let queryString = "";

    // Include params object into URL.searchParams.
    this._parseParamsObject(params, query);

    /**
     * Loop through the params object and push the key and value into the values array
     * Example: values = ['key1=value1', 'key2=value2']
     */
    for (const key in query) {
      values.push(key);
    }
    values.sort(); // Sort the values array

    for (const i in values) {
      if (queryString.length) {
        queryString += "&";
      }
      queryString +=
        encodeURIComponent(values[i]) +
        "=" +
        encodeURIComponent(<string | number | boolean>query[values[i]]);
    }
    queryString = queryString.replace(/%5B/g, "[").replace(/%5D/g, "]");
    return url.split("?")[0] + "?" + queryString;
  }

  /**
   * Get URL
   *
   * @param  {String} endpoint
   * @param  {Object} params
   *
   * @return {String}
   */
  _getUrl(endpoint: string, params: Record<string, unknown>): string {
    const api = this.wpAPIPrefix + "/"; // Add prefix to endpoint

    let url = this.url.slice(-1) === "/" ? this.url : this.url + "/";

    url = url + api + this.version + "/" + endpoint;

    /**
     * If port is defined, add it to the url
     */
    if (this.port !== "") {
      const hostname = new Url(url).hostname;

      url = url.replace(hostname, hostname + ":" + this.port);
    }

    /**
     * If isHttps is false, normalize the query string
     */
    if (!this.isHttps) {
      return this._normalizeQueryString(url, params);
    }

    return url;
  }

  /**
   * Create Hmac was deprecated fot this version at 16.11.2022
   * Get OAuth 1.0a since it is mandatory for WooCommerce REST API
   * You must use OAuth 1.0a "one-legged" authentication to ensure REST API credentials cannot be intercepted by an attacker.
   * Reference: https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication-over-http
   * @return {Object}
   */
  _getOAuth(): OAuth {
    const data = {
      consumer: {
        key: this.credentials.consumerKey,
        secret: this.credentials.consumerSecret,
      },
      signature_method: "HMAC-SHA256",
      hash_function: (base: any, key: any) => {
        return crypto.createHmac("sha256", key).update(base).digest("base64");
      },
    };

    return new OAuth(data);
  }

  /**
   * Axios request
   * Mount the options to send to axios and send the request.
   *
   * @param  {String} method
   * @param  {String} endpoint
   * @param  {Object} data
   * @param  {Object} params
   *
   * @return {Object}
   */
  _request(
    method: WooRestApiMethod,
    endpoint: string,
    data: Record<string, unknown>,
    params: Record<string, unknown> = {}
  ): Promise<any> {
    const url = this._getUrl(endpoint, params);

    const header: RawAxiosRequestHeaders = {
      Accept: "application/json",
    };
    // only set "User-Agent" in node environment
    // the checking method is identical to upstream axios
    if (
      typeof process !== "undefined" &&
      Object.prototype.toString.call(process) === "[object process]"
    ) {
      header["User-Agent"] =
        "WooCommerce REST API - TS Client/" + this.classVersion;
    }
    let options: AxiosRequestConfig = {
      url,
      method,
      responseEncoding: this.encoding,
      timeout: this.timeout,
      responseType: "json",
      headers: { ...header },
      params: {},
      data: data ? JSON.stringify(data) : null,
    };

    /**
     * If isHttps is false, add the query string to the params object
     */
    if (this.isHttps) {
      if (this.queryStringAuth) {
        options.params = {
          consumer_key: this.credentials.consumerKey,
          consumer_secret: this.credentials.consumerSecret,
        };
      } else {
        options.auth = {
          username: this.credentials.consumerKey,
          password: this.credentials.consumerSecret,
        };
      }

      options.params = { ...options.params, ...params };
    } else {
      options.params = this._getOAuth().authorize({
        url,
        method,
      });
    }

    if (options.data) {
      options.headers = {
        ...header,
        "Content-Type": `application/json; charset=${this.encoding}`,
      };
    }

    // Allow set and override Axios options.
    options = { ...options, ...this.axiosConfig };

    return axios(options);
  }

  /**
   * GET requests
   *
   * @param  {String} endpoint
   * @param  {Object} params
   *
   * @return {Object}
   */
  get(endpoint: string, params: Record<string, unknown> = {}): Promise<any> {
    return this._request("GET", endpoint, {}, params);
  }

  /**
   * POST requests
   *
   * @param  {String} endpoint
   * @param  {Object} data
   * @param  {Object} params
   *
   * @return {Object}
   */
  post(
    endpoint: string,
    data: Record<string, unknown>,
    params: Record<string, unknown> = {}
  ): Promise<any> {
    return this._request("POST", endpoint, data, params);
  }

  /**
   * PUT requests
   *
   * @param  {String} endpoint
   * @param  {Object} data
   * @param  {Object} params
   *
   * @return {Object}
   */
  put(
    endpoint: string,
    data: Record<string, unknown>,
    params: Record<string, unknown> = {}
  ): Promise<any> {
    return this._request("PUT", endpoint, data, params);
  }

  /**
   * DELETE requests
   *
   * @param  {String} endpoint
   * @param  {Object} params
   * @param  {Object} params
   *
   * @return {Object}
   */
  delete(endpoint: string, params: Record<string, unknown> = {}): Promise<any> {
    return this._request("DELETE", endpoint, {}, params);
  }

  /**
   * OPTIONS requests
   *
   * @param  {String} endpoint
   * @param  {Object} params
   *
   * @return {Object}
   */
  options(
    endpoint: string,
    params: Record<string, unknown> = {}
  ): Promise<any> {
    return this._request("OPTIONS", endpoint, {}, params);
  }
}

/**
 * Options Exception.
 */
export class OptionsException {
  public name: "Options Error";
  public message: string;
  /**
   * Constructor.
   *
   * @param {String} message
   */
  constructor(message: string) {
    this.name = "Options Error";
    this.message = message;
  }
}
