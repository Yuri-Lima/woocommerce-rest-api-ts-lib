# WooCommerce Store API — Developer Reference

> **Source:** [WooCommerce Store API documentation](https://developer.woocommerce.com/docs/apis/store-api/)  
> **Fetched:** July 3, 2026  
> **Namespace:** `wc/store/v1`  
> **Base URL pattern:** `https://{store}/wp-json/wc/store/v1/{endpoint}`

This document is a local implementation reference for the **WooCommerce Store API** — the **public, customer-facing** REST API for cart, checkout, and product flows.

> **Not the same as `wc/v3`.** The authenticated [WC REST API](https://developer.woocommerce.com/docs/apis/rest-api/) (`wc/v3`) is for admin/back-office operations with consumer keys. The Store API is unauthenticated (session/cookie or token-based) and scoped to the current customer session.

---

## Table of contents

1. [Overview](#overview)
2. [Requirements and limitations](#requirements-and-limitations)
3. [Authentication](#authentication)
4. [Endpoint catalog](#endpoint-catalog)
5. [Cart API](#cart-api)
6. [Cart Items API](#cart-items-api)
7. [Cart Coupons API](#cart-coupons-api)
8. [Checkout API](#checkout-api)
9. [Checkout Order API](#checkout-order-api)
10. [Order API](#order-api)
11. [Products API](#products-api)
12. [Other product resources](#other-product-resources)
13. [Pagination](#pagination)
14. [HTTP status codes](#http-status-codes)
15. [Headless implementation flow](#headless-implementation-flow)
16. [Batch requests](#batch-requests)
17. [Guiding principles](#guiding-principles)
18. [Extensibility](#extensibility)
19. [Official links](#official-links)

---

## Overview

The Store API provides public REST endpoints for building customer-facing experiences:

- Product discovery (search, filter, list)
- Cart management (add/update/remove items, coupons, shipping)
- Checkout (create order from cart, collect addresses, process payment)
- Pay-for-order flows

**Example request:**

```bash
curl "https://example-store.com/wp-json/wc/store/v1/products"
```

All responses are **JSON**. No `.json` suffix is required on URLs.

---

## Requirements and limitations

| Topic | Detail |
|-------|--------|
| Authentication | **No API keys.** Public by design. |
| Session model | Cookie-based WooCommerce customer sessions by default |
| Data scope | Only data for the **current user/session** |
| Write access | Limited to cart/checkout customer data — not store settings |
| Write protection | Mutating cart/checkout endpoints require **Nonce** or **Cart-Token** |
| Sensitive data | Cannot look up arbitrary customers/orders by ID without verification keys |
| Admin operations | Use authenticated [`wc/v3` REST API](https://developer.woocommerce.com/docs/apis/rest-api/) instead |
| Response format | JSON only; avoid returning HTML from custom extensions |

**Store requirements:**

- WooCommerce with Store API enabled (WooCommerce Blocks)
- WordPress with pretty permalinks enabled
- HTTPS recommended for production

---

## Authentication

Store API uses **session identity**, not consumer key/secret.

### Option A: Cookie session (browser / same-site)

- WooCommerce sets session cookies automatically
- For write operations, also send a **Nonce** header

### Option B: Cart Token (headless / mobile / server-side)

Best for apps that cannot rely on browser cookies.

1. `GET /wp-json/wc/store/v1/cart`
2. Read `Cart-Token` from **response headers**
3. Send `Cart-Token: {token}` on subsequent cart/checkout requests
4. **Nonce is not required** when using Cart-Token

```bash
# Obtain token
curl -i "https://example-store.com/wp-json/wc/store/v1/cart"

# Use token
curl --header "Cart-Token: {token}" \
  "https://example-store.com/wp-json/wc/store/v1/cart"
```

### Nonce tokens

Required for:

- **All POST** requests to `/cart/*` endpoints
- **All requests** to `/checkout/*` endpoints

Unless using Cart-Token instead.

| Rule | Detail |
|------|--------|
| Header name | `Nonce` |
| Generation | WordPress only: `wp_create_nonce('wc_store_api')` |
| Rotation | Server returns updated `Nonce` header after successful requests — client must store and reuse |
| Invalid nonce | Returns error (typically 403) |

```bash
curl --header "Nonce: 12345" \
  --request GET \
  "https://example-store.com/wp-json/wc/store/v1/checkout"
```

**Development only** — disable nonce checks (never in production):

```php
add_filter( 'woocommerce_store_api_disable_nonce_check', '__return_true' );
```

---

## Endpoint catalog

Full URL base: `https://{store}/wp-json/wc/store/v1`

| Resource | Methods | Endpoint |
|----------|---------|----------|
| **Cart** | GET | `/cart` |
| | POST | `/cart/add-item` |
| | POST | `/cart/remove-item` |
| | POST | `/cart/update-item` |
| | POST | `/cart/apply-coupon` |
| | POST | `/cart/remove-coupon` |
| | POST | `/cart/update-customer` |
| | POST | `/cart/select-shipping-rate` |
| **Cart Items** | GET, POST, DELETE | `/cart/items` |
| | GET, POST, PUT, DELETE | `/cart/items/:key` |
| **Cart Coupons** | GET, POST, DELETE | `/cart/coupons` |
| | GET, DELETE | `/cart/coupon/:code` |
| **Checkout** | GET, POST, PUT | `/checkout` |
| **Checkout Order** | POST | `/checkout/:id` |
| **Order** | GET | `/order/:id` |
| **Products** | GET | `/products` |
| | GET | `/products/:id` |
| **Product Collection Data** | GET | `/products/collection-data` |
| **Product Attributes** | GET | `/products/attributes` |
| | GET | `/products/attributes/:id` |
| **Product Attribute Terms** | GET | `/products/attributes/:id/terms` |
| **Product Categories** | GET | `/products/categories` |
| **Product Brands** | GET | `/products/brands` |
| **Product Reviews** | GET | `/products/reviews` |
| **Product Tags** | GET | `/products/tags` |
| **Batch** | POST | `/batch` |

---

## Cart API

Returns the current cart for the session. All **POST** cart endpoints require **Nonce** or **Cart-Token** and return the **full cart object**.

### GET `/cart`

No parameters. No auth required for read.

```bash
curl "https://example-store.com/wp-json/wc/store/v1/cart"
```

**Response includes:** `items`, `coupons`, `fees`, `totals`, `shipping_address`, `billing_address`, `shipping_rates`, `payment_methods`, `needs_payment`, `needs_shipping`, `errors`, `extensions`.

### POST `/cart/add-item`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Product or variation ID |
| `quantity` | integer | Yes | Quantity |
| `variation` | array | Yes* | `[{ attribute, value }]` for variations |

\* Empty array for simple products.

**Variation attribute naming:**

- Global attributes: use slug with `pa_` prefix (e.g. `pa_color`)
- Product-specific attributes: attribute name (case-sensitive) or encoded slug

```json
{
  "id": 13,
  "quantity": 1,
  "variation": [
    { "attribute": "pa_color", "value": "blue" },
    { "attribute": "Logo", "value": "Yes" }
  ]
}
```

### POST `/cart/remove-item`

| Param | Type | Required |
|-------|------|----------|
| `key` | string | Yes — cart item key |

### POST `/cart/update-item`

| Param | Type | Required |
|-------|------|----------|
| `key` | string | Yes |
| `quantity` | integer | Yes |

### POST `/cart/apply-coupon`

| Param | Type | Required |
|-------|------|----------|
| `code` | string | Yes |

### POST `/cart/remove-coupon`

| Param | Type | Required |
|-------|------|----------|
| `code` | string | Yes |

### POST `/cart/update-customer`

Update billing/shipping on cart. All address fields optional.

| Param | Type |
|-------|------|
| `billing_address` | object |
| `shipping_address` | object |

Address fields: `first_name`, `last_name`, `company`, `address_1`, `address_2`, `city`, `state`, `postcode`, `country`, `email` (billing), `phone` (billing).

### POST `/cart/select-shipping-rate`

| Param | Type | Required |
|-------|------|----------|
| `package_id` | integer | Yes |
| `rate_id` | string | Yes — e.g. `flat_rate:10` |

### Error responses

Standard error:

```json
{
  "code": "woocommerce_rest_cart_invalid_product",
  "message": "This product cannot be added to the cart.",
  "data": { "status": 400 }
}
```

Conflict (409) — includes current cart in `data.cart`:

```json
{
  "code": "woocommerce_rest_cart_invalid_key",
  "message": "Cart item no longer exists or is invalid.",
  "data": { "status": 409, "cart": { } }
}
```

---

## Cart Items API

REST-style alternative to cart operation endpoints.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cart/items` | List all cart items |
| GET | `/cart/items/:key` | Single item |
| POST | `/cart/items` | Add item (`id`, `quantity`, `variation`) |
| PUT | `/cart/items/:key` | Update quantity |
| DELETE | `/cart/items/:key` | Remove one item |
| DELETE | `/cart/items` | Remove all items (returns `[]`) |

POST/PUT/DELETE require Nonce or Cart-Token.

---

## Cart Coupons API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cart/coupons` | List applied coupons |
| POST | `/cart/coupons` | Apply coupon |
| DELETE | `/cart/coupons` | Remove all coupons |
| GET | `/cart/coupon/:code` | Single coupon |
| DELETE | `/cart/coupon/:code` | Remove coupon |

---

## Checkout API

All endpoints require **Nonce** or **Cart-Token**.

### GET `/checkout`

Returns draft order + customer addresses. Payment info empty until POST/PUT.

```bash
curl --header "Nonce: 12345" \
  "https://example-store.com/wp-json/wc/store/v1/checkout"
```

### PUT `/checkout`

Persist checkout fields before payment.

Query param: `__experimental_calc_totals=true` — recalculate cart totals when updating checkout.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `additional_fields` | object | No | Plugin custom fields |
| `payment_method` | string | No | Selected gateway ID |
| `order_notes` | string | No | Customer note |

Response may include `__experimentalCart` with updated totals.

### POST `/checkout`

Create order from cart and process payment.

| Attribute | Type | Required |
|-----------|------|----------|
| `billing_address` | object | Yes |
| `shipping_address` | object | Yes |
| `payment_method` | string | Yes |
| `customer_note` | string | No |
| `payment_data` | array | No — gateway-specific `{ key, value }` pairs |
| `customer_password` | string | No — for new account creation |
| `create_account` | boolean | No |
| `extensions` | object | No |

**Example `payment_data` (Stripe):**

```json
{
  "payment_data": [
    { "key": "stripe_source", "value": "src_xxxxxxxxxxxxx" },
    { "key": "paymentMethod", "value": "stripe" }
  ]
}
```

**Success response** includes `payment_result`:

```json
{
  "payment_result": {
    "payment_status": "success",
    "payment_details": [],
    "redirect_url": "https://store.com/checkout/order-received/146/?key=wc_order_..."
  }
}
```

---

## Checkout Order API

Process payment for an **existing** order (pay-for-order flow).

### POST `/checkout/:order_id`

| Attribute | Type | Required |
|-----------|------|----------|
| `key` | string | Yes — order key |
| `billing_email` | string | No — required for guest orders |
| `billing_address` | object | Yes |
| `shipping_address` | object | Yes |
| `payment_method` | string | Yes |
| `payment_data` | array | No |

Requires Nonce or Cart-Token.

---

## Order API

Retrieve pay-for-order data (not arbitrary order lookup).

### GET `/order/:id`

| Query param | Required | Description |
|-------------|----------|-------------|
| `key` | Yes | Order key (`wc_order_...`) |
| `billing_email` | Guest orders | Email verification |

```bash
curl "https://example-store.com/wp-json/wc/store/v1/order/147?key=wc_order_xxx&billing_email=guest@example.com"
```

---

## Products API

Public product data. **No auth required.**

### Visibility rules

- Only **published** products returned
- Draft/pending → `404`
- Password-protected: `description`/`short_description` redacted until password submitted via frontend cookie (`wp-postpass_*`)
- Field `is_password_protected` indicates protected state

### GET `/products`

Common query parameters:

| Param | Description |
|-------|-------------|
| `search` | Text search |
| `slug` | Comma-separated slugs |
| `page`, `per_page` | Pagination (`per_page` max 100) |
| `orderby` | `date`, `price`, `popularity`, `rating`, `title`, etc. |
| `order` | `asc` / `desc` |
| `category` | Category IDs or slugs |
| `tag` | Tag ID |
| `brand` | Brand IDs or slugs |
| `on_sale` | `true` / `false` |
| `min_price`, `max_price` | Smallest currency unit (e.g. `10025` = $100.25) |
| `stock_status` | `instock`, `outofstock`, `onbackorder` |
| `featured` | Boolean |
| `type` | Product type (`simple`, `variation`, etc.) |
| `attributes` | Filter by attribute terms |
| `catalog_visibility` | `visible`, `catalog`, `search`, `hidden` |
| `related` | Related to product ID |
| `_embed` | Embed linked resources (upsells, cross-sells, related) |

```bash
curl "https://example-store.com/wp-json/wc/store/v1/products?on_sale=true&per_page=20"
```

### GET `/products/:id`

Single product by numeric ID.

### GET `/products/:slug`

Single product by slug (same route pattern).

### Variations

```bash
curl "https://example-store.com/wp-json/wc/store/v1/products?type=variation"
```

### Product links & embedding

Response `_links` may include embeddable: `upsells`, `cross_sells`, `related`.

```bash
curl "https://example-store.com/wp-json/wc/store/v1/products/34?_embed"
```

---

## Other product resources

All **GET**, no auth required.

| Endpoint | Description |
|----------|-------------|
| `/products/collection-data` | Aggregated collection metadata (price range, attribute counts, rating counts) |
| `/products/attributes` | List product attributes |
| `/products/attributes/:id` | Single attribute |
| `/products/attributes/:id/terms` | Terms for attribute |
| `/products/categories` | Product categories |
| `/products/brands` | Product brands |
| `/products/reviews` | Product reviews |
| `/products/tags` | Product tags |

---

## Pagination

| Param | Default | Max |
|-------|---------|-----|
| `page` | 1 | — |
| `per_page` | 10 | 100 |

**Response headers:**

| Header | Description |
|--------|-------------|
| `X-WP-Total` | Total items |
| `X-WP-TotalPages` | Total pages |
| `Link` | `next`, `prev`, `first`, `last`, `up` |

```bash
curl "https://example-store.com/wp-json/wc/store/v1/products?page=2&per_page=20"
```

---

## HTTP status codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | Deleted successfully (no body) |
| 400 | Missing/invalid parameter |
| 403 | Not allowed (e.g. invalid nonce) |
| 404 | Resource not found |
| 405 | Method not allowed |
| 409 | Conflict — cart/order state changed; may include current cart in error |
| 500 | Server error |

---

## Headless implementation flow

Typical sequence for a headless storefront:

```
1. GET  /products              → browse catalog
2. GET  /cart                  → obtain Cart-Token header
3. POST /cart/add-item         → Cart-Token + add product
4. POST /cart/update-customer  → set addresses
5. POST /cart/select-shipping-rate → pick shipping
6. GET  /checkout              → get draft order
7. PUT  /checkout              → set payment method, notes
8. POST /checkout              → place order + pay
```

**TypeScript / Node considerations:**

- Forward `Cart-Token` and cookies between requests (use `axios`/`fetch` with credential jar or manual header management)
- Store and rotate `Nonce` from response headers when not using Cart-Token
- Prices are in **minor units** as strings (e.g. `"1800"` = $18.00 with 2 decimal places)
- Handle 409 cart conflicts by syncing `data.cart` from error response

**Minimal fetch example:**

```typescript
const BASE = "https://example-store.com/wp-json/wc/store/v1";

// 1. Bootstrap session + cart token
const cartRes = await fetch(`${BASE}/cart`);
const cartToken = cartRes.headers.get("Cart-Token")!;
const cart = await cartRes.json();

// 2. Add item (headless)
const addRes = await fetch(`${BASE}/cart/add-item`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Cart-Token": cartToken,
  },
  body: JSON.stringify({ id: 100, quantity: 1, variation: [] }),
});
const updatedCart = await addRes.json();
```

---

## Batch requests

Add multiple items in one round trip:

```http
POST /wc/store/v1/batch
```

```json
{
  "requests": [
    {
      "path": "/wc/store/v1/cart/add-item",
      "method": "POST",
      "body": { "id": 26, "quantity": 1 },
      "headers": { "Nonce": "1db1d13784" }
    },
    {
      "path": "/wc/store/v1/cart/add-item",
      "method": "POST",
      "body": { "id": 27, "quantity": 1 },
      "headers": { "Nonce": "1db1d13784" }
    }
  ]
}
```

---

## Guiding principles

Key rules for Store API consumers and extenders:

1. **Well-defined JSON schema** — predictable request/response shapes
2. **Resource-oriented routes** — nouns not verbs (`/cart`, `/products`)
3. **Current user data only** — no cross-customer access
4. **Paginated collections** — max `per_page=100`
5. **Standard HTTP status codes** — errors use `woocommerce_rest_*` codes
6. **Avoid breaking changes** — schema is a public contract
7. **Snake_case** properties, US English field names
8. **Client escapes output** — API returns sanitized but not escaped HTML

---

## Extensibility

Third-party plugins can extend Store API via `ExtendSchema` (not traditional WP filters for response data).

- [Extending the Store API](https://developer.woocommerce.com/docs/apis/store-api/extending-store-api/)
- [Store API hooks (filters)](https://github.com/woocommerce/woocommerce-blocks/blob/trunk/docs/third-party-developers/extensibility/hooks/filters.md)

For sensitive/admin data or new standalone routes, use:

- Authenticated [WC REST API](https://developer.woocommerce.com/docs/apis/rest-api/)
- WordPress [`register_rest_route()`](https://developer.wordpress.org/reference/functions/register_rest_route/)

---

## Official links

| Topic | URL |
|-------|-----|
| Store API overview | https://developer.woocommerce.com/docs/apis/store-api/ |
| Nonce tokens | https://developer.woocommerce.com/docs/apis/store-api/nonce-tokens/ |
| Cart tokens | https://developer.woocommerce.com/docs/apis/store-api/cart-tokens/ |
| Cart endpoints | https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/cart/ |
| Cart items | https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/cart-items/ |
| Cart coupons | https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/cart-coupons/ |
| Checkout | https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/checkout/ |
| Checkout order | https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/checkout-order/ |
| Order | https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/order/ |
| Products | https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/products/ |
| Guiding principles | https://developer.woocommerce.com/docs/apis/store-api/guiding-principles/ |
| WC REST API (admin) | https://developer.woocommerce.com/docs/apis/rest-api/ |

---

## Relation to `woocommerce-rest-ts-api`

This repository (`woocommerce-rest-ts-api`) currently targets the **authenticated `wc/v3` REST API** with consumer key/secret.

The **Store API** (`wc/store/v1`) is a separate surface. To support it in TypeScript, consider:

- A dedicated `WooCommerceStoreApi` client class
- Cart-Token / Nonce header management
- Cookie jar support for session persistence
- Store-specific response types (cart, checkout, store product schema)

See this doc when implementing that client or building headless cart/checkout flows.