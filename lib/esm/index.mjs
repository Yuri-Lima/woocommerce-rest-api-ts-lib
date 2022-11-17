"use strict";
import axios from "axios";
import crypto from "node:crypto";
import OAuth from "oauth-1.0a";
import Url from "url-parse";
export default class WooCommerceRestApi {
    constructor(opt) {
        this._opt = opt;
        if (!(this instanceof WooCommerceRestApi)) {
            return new WooCommerceRestApi(opt);
        }
        if (!this._opt.url) {
            throw new OptionsException("url is required");
        }
        if (!this._opt.consumerKey) {
            throw new OptionsException("consumerKey is required");
        }
        if (!this._opt.consumerSecret) {
            throw new OptionsException("consumerSecret is required");
        }
        this._setDefaultsOptions(this._opt);
    }
    _setDefaultsOptions(opt) {
        this._opt.wpAPIPrefix = opt.wpAPIPrefix || "wp-json";
        this._opt.version = opt.version || "wc/v3";
        this._opt.isHttps = /^https/i.test(this._opt.url);
        this._opt.encoding = opt.encoding || "utf-8";
        this._opt.queryStringAuth = opt.queryStringAuth || false;
        this._opt.classVersion = "0.0.2";
    }
    _parseParamsObject(params, query) {
        for (const key in params) {
            if (typeof params[key] === "object") {
                for (const subKey in params[key]) {
                    query[key + "[" + subKey + "]"] = params[key][subKey];
                }
            }
            else {
                query[key] = params[key];
            }
        }
        return query;
    }
    _normalizeQueryString(url, params) {
        if (url.indexOf("?") === -1 && Object.keys(params).length === 0) {
            return url;
        }
        const query = new Url(url, true).query;
        const values = [];
        let queryString = "";
        this._parseParamsObject(params, query);
        for (const key in query) {
            values.push(key);
        }
        values.sort();
        for (const i in values) {
            if (queryString.length)
                queryString += "&";
            queryString += encodeURIComponent(values[i]) + "=" + encodeURIComponent(query[values[i]]);
        }
        queryString = queryString.replace(/%5B/g, "[").replace(/%5D/g, "]");
        return url.split("?")[0] + "?" + queryString;
    }
    _getUrl(endpoint, params) {
        const api = this._opt.wpAPIPrefix + "/";
        let url = this._opt.url.slice(-1) === "/" ? this._opt.url : this._opt.url + "/";
        url = url + api + this._opt.version + "/" + endpoint;
        if (this._opt.port) {
            const hostname = new Url(url).hostname;
            url = url.replace(hostname, hostname + ":" + this._opt.port);
        }
        if (!this._opt.isHttps) {
            return this._normalizeQueryString(url, params);
        }
        return url;
    }
    _getOAuth() {
        const data = {
            consumer: {
                key: this._opt.consumerKey,
                secret: this._opt.consumerSecret,
            },
            signature_method: "HMAC-SHA256",
            hash_function: (base, key) => {
                return crypto.createHmac("sha256", key).update(base).digest("base64");
            },
        };
        return new OAuth(data);
    }
    _request(method, endpoint, data, params = {}) {
        const url = this._getUrl(endpoint, params);
        const header = {
            Accept: "application/json",
        };
        if (typeof process !== "undefined" &&
            Object.prototype.toString.call(process) === "[object process]") {
            header["User-Agent"] =
                "WooCommerce REST API - TS Client/" + this._opt.classVersion;
        }
        let options = {
            url,
            method,
            responseEncoding: this._opt.encoding,
            timeout: this._opt.timeout,
            responseType: "json",
            headers: Object.assign({}, header),
            params: {},
            data: data ? JSON.stringify(data) : null,
        };
        if (this._opt.isHttps) {
            if (this._opt.queryStringAuth) {
                options.params = {
                    consumer_key: this._opt.consumerKey,
                    consumer_secret: this._opt.consumerSecret,
                };
            }
            else {
                options.auth = {
                    username: this._opt.consumerKey,
                    password: this._opt.consumerSecret,
                };
            }
            options.params = Object.assign(Object.assign({}, options.params), params);
        }
        else {
            options.params = this._getOAuth().authorize({
                url,
                method,
            });
        }
        if (options.data) {
            options.headers = Object.assign(Object.assign({}, header), { "Content-Type": `application/json; charset=${this._opt.encoding}` });
        }
        options = Object.assign(Object.assign({}, options), this._opt.axiosConfig);
        return axios(options);
    }
    get(endpoint, params) {
        return this._request("GET", endpoint, {}, params);
    }
    post(endpoint, data, params = {}) {
        return this._request("POST", endpoint, data, params);
    }
    put(endpoint, data, params = {}) {
        return this._request("PUT", endpoint, data, params);
    }
    delete(endpoint, params = {}) {
        return this._request("DELETE", endpoint, {}, params);
    }
    options(endpoint, params = {}) {
        return this._request("OPTIONS", endpoint, {}, params);
    }
}
export class OptionsException {
    constructor(message) {
        this.name = "Options Error";
        this.message = message;
    }
}
