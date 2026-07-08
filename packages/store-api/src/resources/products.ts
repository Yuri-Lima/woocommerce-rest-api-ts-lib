/**
 * Storefront products — wc/store/v1/products*
 * Separate types from admin REST products.
 */

import type { StoreHttpClient } from "../http.js";
import type { ProductListParams, StoreProduct } from "../types.js";

export class ProductsResource {
  constructor(private readonly http: StoreHttpClient) {}

  async list(params: ProductListParams = {}): Promise<StoreProduct[]> {
    const res = await this.http.request<StoreProduct[]>("GET", "products", {
      query: params as Record<string, unknown>,
    });
    return Array.isArray(res.data) ? res.data : [];
  }

  async get(id: number): Promise<StoreProduct> {
    const res = await this.http.request<StoreProduct>(
      "GET",
      `products/${id}`,
    );
    return res.data;
  }

  async collectionData(
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    const res = await this.http.request<unknown>(
      "GET",
      "products/collection-data",
      { query: params },
    );
    return res.data;
  }

  async listCategories(
    params: Record<string, unknown> = {},
  ): Promise<unknown[]> {
    const res = await this.http.request<unknown[]>(
      "GET",
      "products/categories",
      { query: params },
    );
    return Array.isArray(res.data) ? res.data : [];
  }

  async listTags(params: Record<string, unknown> = {}): Promise<unknown[]> {
    const res = await this.http.request<unknown[]>("GET", "products/tags", {
      query: params,
    });
    return Array.isArray(res.data) ? res.data : [];
  }

  async listAttributes(
    params: Record<string, unknown> = {},
  ): Promise<unknown[]> {
    const res = await this.http.request<unknown[]>(
      "GET",
      "products/attributes",
      { query: params },
    );
    return Array.isArray(res.data) ? res.data : [];
  }

  async listReviews(
    params: Record<string, unknown> = {},
  ): Promise<unknown[]> {
    const res = await this.http.request<unknown[]>(
      "GET",
      "products/reviews",
      { query: params },
    );
    return Array.isArray(res.data) ? res.data : [];
  }
}
