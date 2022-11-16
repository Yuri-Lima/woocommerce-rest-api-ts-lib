"use strict";

import axios,{AxiosRequestConfig, RawAxiosRequestHeaders} from "axios";
import crypto from 'node:crypto';
import OAuth from "oauth-1.0a"; // Mandatory for WooCommerce REST API
import Url from "url-parse";

/**
 * Interfaces/Types for WooCommerce REST API
 */
import {
  WooRestApiMethod,
  IWooRestApiOptions,
  IWooRestApiHeaders
} from "./interfaces-types";

/**
 * Woo REST API Class
 *
 * @param {Object} opt
 */
export default class WooCommerceRestApi {
  protected _opt: IWooRestApiOptions = {
    url: "",
    wpAPIPrefix: "",
    version: "wc/v3",
    isHttps: false,
    consumerKey: "",
    consumerSecret: "",
    encoding: "utf-8",
    queryStringAuth: false,
    port: 0,
    timeout: 0,
    classVersion: "",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": `WooCommerce API TS Client-Node.js/`,
      Accept: "application/json",
      Authorization: ""
    }
  };
  
  /**
   * Class constructor.
   *
   * @param {IWooRestApiOptions} opt
   */
  constructor(opt: IWooRestApiOptions) {
    /**
     * return new WooCommerceRestApi(opt) if  this is not an instance of WooCommerceRestApi
     */
    if (!(this instanceof WooCommerceRestApi)) {
      return new WooCommerceRestApi(opt);
    }

    opt = opt || {}; // if opt is undefined, set it to an empty object
    /**
     * Pre Checks for options
     */
    if (!opt.url) {
      throw new OptionsException("url is required");
    }

    if (!opt.consumerKey) {
      throw new OptionsException("consumerKey is required");
    }

    if (!opt.consumerSecret) {
      throw new OptionsException("consumerSecret is required");
    }

    /**
     * Set default options
     */
    this._setDefaultsOptions(opt);
    this._opt.classVersion = "0.1.0";
  }

  /**
   * Set default options
   *
   * @param {Object} opt
   */
  _setDefaultsOptions(opt: IWooRestApiOptions): void {
    this._opt.url = opt.url || "https://test.dev";
    this._opt.wpAPIPrefix = opt.wpAPIPrefix || "wp-json";
    this._opt.version = opt.version || "wc/v3";
    this._opt.isHttps = /^https/i.test(this._opt.url) || false;
    this._opt.consumerKey = opt.consumerKey || "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    this._opt.consumerSecret = opt.consumerSecret || "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    this._opt.encoding = opt.encoding || "utf-8";
    this._opt.queryStringAuth = opt.queryStringAuth || false;
    this._opt.port = <number>opt.port || 0;
    this._opt.timeout = <number>opt.timeout || 0;
  }

  /**
   * Parse params to object
   *
   * @param {Object} params
   * @param {Object} query
   */
  _parseParamsObject(params: Record<string, any>, query: Record<string, any>): Record<string, any> {
    for (const key in params) {
      if(typeof params[key] === 'object') {
        for (const subKey in params[key]) {
          query[key + '[' + subKey + ']'] = params[key][subKey];
        }
      } else{
        query[key] = params[key];
      }
    }
    return query;
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
  _normalizeQueryString(url: string, params: Record<string, any>= {}): string {
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
    params = this._parseParamsObject(params, query);

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
      queryString += encodeURIComponent(values[i]) + "=" + encodeURIComponent(<string | number | boolean>query[values[i]]);
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
    /**
     * Add prefix to endpoint if 
     */
    console.log("this._opt.url:", this._opt.url);
    const api = this._opt.wpAPIPrefix + "/";

    let url = this._opt.url.slice(-1) === "/" ? this._opt.url : this._opt.url + "/";

    url = url + api + this._opt.version + "/" + endpoint;

    /**
     * If port is defined, add it to the url
     */
    if (this._opt.port) {
      const hostname = new Url(url).hostname;
      url = url.replace(hostname, hostname + ":" + this._opt.port);
    }

    /**
     * If isHttps is false, normalize the query string
     */
    if (!this._opt.isHttps) {
      return this._normalizeQueryString(url, params);
    }
    return url;
  }

  /**
   * Get OAuth
   *
   * @return {Object}
   */
  _getOAuth(): OAuth {
    const data = {
      consumer: {
        key: this._opt.consumerKey,
        secret: this._opt.consumerSecret
      },
      signature_method: "HMAC-SHA256",
      hash_function: (base: any, key: any) => {
        return crypto.createHmac("sha256", key).update(base).digest("base64");
      }
    };
    return new OAuth(data);
  }

  /**
   * Do requests
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
    data: { [key: string ]: any } = {},
    params: { [key: string ]: any } = {}
  ): Promise<any> {
    const url = this._getUrl(endpoint, params);
    this._opt.headers = { 
      Accept: "application/json",
    }

    if (data) this._opt.headers.["Content-Type"] = `application/json; charset=${this._opt.encoding}`;
    // only set "User-Agent" in node environment
    // the checking method is identical to upstream axios
    if (
      typeof process !== "undefined" &&
      Object.prototype.toString.call(process) === "[object process]"
    ) {
      header["User-Agent"] =
        "Woo REST API - TS Client/" + this._opt.classVersion;
    }
    if (this._opt.isHttps) {
      if (this._opt.queryStringAuth) {
        this._opt.params = {
          consumer_key: this._opt.consumerKey,
          consumer_secret: this._opt.consumerSecret
        };
      } else {
        this._opt.auth = {
          username: this._opt.consumerKey,
          password: this._opt.consumerSecret
        };
      }
      this._opt.url = url;
      this._opt.method = method;
      this._opt.responseType = "json";
      this._opt.headers = { ...header };

      this._opt.params = { ...this._opt.params, ...params };
    } else {
      this._opt.params = this._getOAuth().authorize({ url, method });
    }

    /**
     * Allow set and override Axios options.
     * @Deprecated. Use `axios` extends instead.
     */
    // options = { ...options, ...this.axiosConfig };
     console.log("this._opt:", this._opt);
    return new Promise((resolve, reject) => {
      resolve({status:201});
    });
    return axios(this._opt);
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
    data: { [key: string]: any },
    params: { [key: string]: any }
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
