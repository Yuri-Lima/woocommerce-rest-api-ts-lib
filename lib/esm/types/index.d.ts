import { AxiosRequestConfig } from "axios";
import OAuth from "oauth-1.0a";
import { WooRestApiMethod, IWooRestApiQuery, IWooRestApiOptions, WooRestApiEndpoint, OrdersMainParams, ProductsMainParams, SystemStatusParams, CouponsParams, CustomersParams } from "./typesANDinterfaces.js";
/**
 * Set the axiosConfig property to the axios config object.
 * Could reveive any axios |... config objects.
 * @param {AxiosRequestConfig} axiosConfig
 */
type WooRestApiOptions = IWooRestApiOptions<AxiosRequestConfig>;
/**
 * Set all the possible query params for the WooCommerce REST API.
 */
type WooRestApiParams = CouponsParams & CustomersParams & OrdersMainParams & ProductsMainParams & SystemStatusParams;
/**
 * WooCommerce REST API wrapper
 *
 * @param {Object} opt
 */
export default class WooCommerceRestApi<T extends WooRestApiOptions> {
    protected _opt: T;
    /**
     * Class constructor.
     *
     * @param {Object} opt
     */
    constructor(opt: T);
    /**
     * Set default options
     *
     * @param {Object} opt
     */
    _setDefaultsOptions(opt: T): void;
    /**
     * Parse params to object.
     *
     * @param {Object} params
     * @param {Object} query
     * @return {Object} IWooRestApiQuery
     */
    _parseParamsObject<T>(params: Record<string, T>, query: Record<string, any>): IWooRestApiQuery;
    /**
     * Normalize query string for oAuth 1.0a
     * Depends on the _parseParamsObject method
     *
     * @param  {String} url
     * @param  {Object} params
     *
     * @return {String}
     */
    _normalizeQueryString(url: string, params: Record<string, any>): string;
    /**
     * Get URL
     *
     * @param  {String} endpoint
     * @param  {Object} params
     *
     * @return {String}
     */
    _getUrl(endpoint: string, params: Record<string, unknown>): string;
    /**
     * Create Hmac was deprecated fot this version at 16.11.2022
     * Get OAuth 1.0a since it is mandatory for WooCommerce REST API
     * You must use OAuth 1.0a "one-legged" authentication to ensure REST API credentials cannot be intercepted by an attacker.
     * Reference: https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication-over-http
     * @return {Object}
     */
    _getOAuth(): OAuth;
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
    _request(method: WooRestApiMethod, endpoint: string, data: Record<string, unknown>, params?: Record<string, unknown>): Promise<any>;
    /**
     * GET requests
     *
     * @param  {String} endpoint
     * @param  {Object} params
     *
     * @return {Object}
     */
    get<T extends WooRestApiEndpoint>(endpoint: T, params: WooRestApiParams): Promise<any>;
    /**
     * POST requests
     *
     * @param  {String} endpoint
     * @param  {Object} data
     * @param  {Object} params
     *
     * @return {Object}
     */
    post<T extends WooRestApiEndpoint>(endpoint: T, data: Record<string, unknown>, params?: WooRestApiParams): Promise<any>;
    /**
     * PUT requests
     *
     * @param  {String} endpoint
     * @param  {Object} data
     * @param  {Object} params
     *
     * @return {Object}
     */
    put<T extends WooRestApiEndpoint>(endpoint: T, data: Record<string, unknown>, params?: WooRestApiParams): Promise<any>;
    /**
     * DELETE requests
     *
     * @param  {String} endpoint
     * @param  {Object} params
     * @param  {Object} params
     *
     * @return {Object}
     */
    delete<T extends WooRestApiEndpoint>(endpoint: T, params?: WooRestApiParams): Promise<any>;
    /**
     * OPTIONS requests
     *
     * @param  {String} endpoint
     * @param  {Object} params
     *
     * @return {Object}
     */
    options<T extends WooRestApiEndpoint>(endpoint: T, params?: WooRestApiParams): Promise<any>;
}
/**
 * Options Exception.
 */
export declare class OptionsException {
    name: "Options Error";
    message: string;
    /**
     * Constructor.
     *
     * @param {String} message
     */
    constructor(message: string);
}
export {};
//# sourceMappingURL=index.d.ts.map