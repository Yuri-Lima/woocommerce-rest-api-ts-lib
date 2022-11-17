"use strict";
import axios from "axios";
import crypto from "node:crypto";
import OAuth from "oauth-1.0a";
import Url from "url-parse";
export default class WooCommerceRestApi {
    constructor(opt) {
        this.credentials = {
            consumerKey: "",
            consumerSecret: "",
        };
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
    _setDefaultsOptions(opt) {
        this.url = opt.url;
        this.wpAPIPrefix = opt.wpAPIPrefix || "wp-json";
        this.version = opt.version || "wc/v3";
        this.isHttps = /^https/i.test(this.url);
        this.credentials.consumerKey = opt.consumerKey;
        this.credentials.consumerSecret = opt.consumerSecret;
        this.encoding = opt.encoding || "utf-8";
        this.queryStringAuth = opt.queryStringAuth || false;
        this.port = opt.port || "";
        this.timeout = opt.timeout;
        this.axiosConfig = opt.axiosConfig;
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
            if (queryString.length) {
                queryString += "&";
            }
            queryString +=
                encodeURIComponent(values[i]) +
                    "=" +
                    encodeURIComponent(query[values[i]]);
        }
        queryString = queryString.replace(/%5B/g, "[").replace(/%5D/g, "]");
        return url.split("?")[0] + "?" + queryString;
    }
    _getUrl(endpoint, params) {
        const api = this.wpAPIPrefix + "/";
        let url = this.url.slice(-1) === "/" ? this.url : this.url + "/";
        url = url + api + this.version + "/" + endpoint;
        if (this.port !== "") {
            const hostname = new Url(url).hostname;
            url = url.replace(hostname, hostname + ":" + this.port);
        }
        if (!this.isHttps) {
            return this._normalizeQueryString(url, params);
        }
        return url;
    }
    _getOAuth() {
        const data = {
            consumer: {
                key: this.credentials.consumerKey,
                secret: this.credentials.consumerSecret,
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
                "WooCommerce REST API - TS Client/" + this.classVersion;
        }
        let options = {
            url,
            method,
            responseEncoding: this.encoding,
            timeout: this.timeout,
            responseType: "json",
            headers: Object.assign({}, header),
            params: {},
            data: data ? JSON.stringify(data) : null,
        };
        if (this.isHttps) {
            if (this.queryStringAuth) {
                options.params = {
                    consumer_key: this.credentials.consumerKey,
                    consumer_secret: this.credentials.consumerSecret,
                };
            }
            else {
                options.auth = {
                    username: this.credentials.consumerKey,
                    password: this.credentials.consumerSecret,
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
            options.headers = Object.assign(Object.assign({}, header), { "Content-Type": `application/json; charset=${this.encoding}` });
        }
        options = Object.assign(Object.assign({}, options), this.axiosConfig);
        return axios(options);
    }
    get(endpoint, params = {}) {
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
