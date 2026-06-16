[![Updates Test CI](https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib/actions/workflows/updates.test.yml/badge.svg?branch=main)](https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib/actions/workflows/updates.test.yml)
![npm](https://img.shields.io/npm/v/woocommerce-rest-ts-api)
![npm](https://img.shields.io/npm/dt/woocommerce-rest-ts-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Known Vulnerabilities](https://snyk.io/test/github/Yuri-Lima/woocommerce-rest-api-ts-lib/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Yuri-Lima/woocommerce-rest-api-ts-lib?targetFile=package.json)

<div align="center" width="100%">
    <img src="./images/woocommerce-wordpress-logo.png" width="128" alt="woocommerce_integration_api" />
</div>

# WooCommerce REST API - TypeScript Library

A modern, type-safe TypeScript library for the WooCommerce REST API with enhanced error handling, improved type safety, convenient methods for common operations, and **complete production-grade security hardening** (v8.0.0) plus a full modular architectural overhaul (separated types, DI-friendly client, strictest TS, tree-shakable ESM-first). All high-severity Dependabot alerts (lodash, tar, tmp, rollup, minimatch, glob, esbuild, js-yaml, etc.) have been resolved via upgrades + overrides + code-level input sanitization and resource limits. See SECURITY.md and MIGRATION.md.

✨ **New Features in v8.0.0 (Major Security + Architecture Release):**
- 🛡️ **Complete Dependabot resolution** — every high/critical (rollup traversal, esbuild RCE, tar symlink/hardlink, tmp escape, lodash template injection + proto pollution, minimatch/glob ReDoS+CLI, js-yaml, flatted, picomatch, etc.) fixed via upgrades, removal of risky build tools (tsup), direct secure esbuild, and exhaustive overrides. See `SECURITY.md`.
- 🛡️ **Runtime path sanitization & validation** — `url`/`version`/`wpAPIPrefix`/`endpoint` now actively reject traversal and illegal input (defense-in-depth on top of prior resource limits).
- 🏗️ Full type separation (`src/types/{core,requests,responses,errors,models}`) with barrels; no more monolithic file. Monorepo-style clarity while keeping identical public API.
- 🧪 All tests green with deterministic nock mocks (no live WC required for the suite).

Previous v7.1.2 security work (Axios CVE, handlebars override, throttling/limits/retries) is fully preserved and extended.

---

**v7.1.2 notes (historical):**
- 🛡️ **Handlebars / Dependabot #91 Fix (CVE-2026-33937 AST Type Confusion RCE)** - Full audit confirmed zero usage of handlebars in runtime/library code (only transitive in release tooling for changelogs). Forced secure `handlebars@4.7.9` via overrides in package.json + lockfiles. No impact on published package or backward compatibility. See CHANGELOG for details.
- 🛡️ **Enhanced Error Handling** - Custom error classes with detailed error information
- 🔧 **Improved Type Safety** - Better response typing with `WooCommerceApiResponse<T>`
- 🚀 **Convenience Methods** - Easy-to-use methods for common operations
- 📦 **Modern Module Support** - Full ESM and CJS compatibility
- 🎯 **Better Developer Experience** - Comprehensive TypeScript support
- 🔧 **Fixed Configuration Issues** - Resolved TypeScript and ESLint compatibility problems
- 📝 **Updated Dependencies** - Latest TypeScript 5.8.3 and modern tooling (plus secure Axios)

New TypeScript library for WooCommerce REST API. Supports CommonJS (CJS) and ECMAScript (ESM)

## 🚀 Key Features

- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Modern**: ES2020+ with async/await support
- **Flexible**: Support for both CommonJS and ES modules
- **Secure**: Built-in OAuth 1.0a authentication + hardened HTTP client against resource exhaustion (CVE-2026-44488)
- **Resilient**: Per-client concurrency throttling (pluggable `Throttler`), 429-aware retries (pluggable `RetryStrategy`), timeout enforcement, connection keep-alive by default
- **Modular internals**: `RequestSanitizer`, `ErrorNormalizer`, `PaginationHelper` + composition-based design with DI hooks (while preserving 100% public + `_` internal BC)
- **Error Handling**: Custom error classes with detailed error information
- **Convenience Methods**: Easy-to-use methods for common operations
- **Lightweight**: Minimal dependencies with tree-shaking support

## 🔧 Installation

**pnpm (recommended — the project is now pnpm-exclusive):**

```bash
pnpm add woocommerce-rest-ts-api
```

**npm / yarn (still supported for consumers):**

```bash
npm install --save woocommerce-rest-ts-api
# or
yarn add woocommerce-rest-ts-api
```

See `PERFORMANCE_SECURITY_AUDIT.md` and `FINAL_REVIEW.md` for the latest production-grade analysis. New reusable helpers (`collectAllPages`, `parsePaginationHeaders`) are exported for pagination use-cases.

## 📚 Getting Started

Generate API credentials (Consumer Key & Consumer Secret) following this instructions <http://docs.woocommerce.com/document/woocommerce-rest-api/>.

Check out the WooCommerce API endpoints and data that can be manipulated in <http://woocommerce.github.io/woocommerce-rest-api-docs/>.

## ⚙️ Setup

### ESM Example:

```typescript
import WooCommerceRestApi, { WooRestApiOptions } from "woocommerce-rest-ts-api";

const options: WooRestApiOptions = {
    url: "https://your-store.com",
    consumerKey: "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    consumerSecret: "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    version: "wc/v3",
    queryStringAuth: false // Force Basic Authentication as query string when using HTTPS
};

const api = new WooCommerceRestApi(options);
```

### CJS Example:

```javascript
const WooCommerceRestApi = require("woocommerce-rest-ts-api").default;

const api = new WooCommerceRestApi({
  url: "https://your-store.com",
  consumerKey: "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  consumerSecret: "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  version: "wc/v3",
  queryStringAuth: false
});
```

### 🔧 Configuration Options

| Option            | Type      | Required | Description                                                                                                         |
|-------------------|-----------|----------|---------------------------------------------------------------------------------------------------------------------|
| `url`             | `String`  | yes      | Your Store URL, example: https://your-store.com                                                                     |
| `consumerKey`     | `String`  | yes      | Your API consumer key                                                                                               |
| `consumerSecret`  | `String`  | yes      | Your API consumer secret                                                                                            |
| `wpAPIPrefix`     | `String`  | no       | Custom WP REST API URL prefix, used to support custom prefixes created with the `rest_url_prefix` filter            |
| `version`         | `String`  | no       | API version, default is `wc/v3`                                                                                     |
| `encoding`        | `String`  | no       | Encoding, default is 'utf-8'                                                                                        |
| `queryStringAuth` | `Bool`    | no       | When `true` and using under HTTPS force Basic Authentication as query string, default is `false`                    |
| `port`                  | `string`  | no       | Provide support for URLs with ports, eg: `8080`                                                                     |
| `timeout`               | `Integer` | no       | Define the request timeout (enforced default: 30000ms if unset)                                                     |
| `axiosConfig`           | `Object`  | no       | Define the custom [Axios config](https://github.com/axios/axios#request-config), also override this library options |
| `maxContentLength`      | `Integer` | no       | Max response body size (bytes). Default 10MB. Mitigates resource exhaustion (CVE-2026-44488). `-1` disables.        |
| `maxBodyLength`         | `Integer` | no       | Max request body size (bytes). Default 10MB.                                                                        |
| `maxConcurrentRequests` | `Integer` | no       | Max in-flight requests for client throttling (0=unlimited, default for compat). Enables internal queue.             |
| `retryConfig`           | `Object`  | no       | `{retries?: number, retryDelay?: number, retryOn?: number[]}` for exp backoff + 429/RateLimit awareness. Default: 0 (disabled). Recommended: retries:3+ for production resilience against rate limits/transients. |

## 🎯 Enhanced Response Type

All API methods now return a `WooCommerceApiResponse<T>` object with the following structure:

```typescript
interface WooCommerceApiResponse<T> {
    data: T;           // The actual response data
    status: number;    // HTTP status code
    statusText: string; // HTTP status text
    headers: any;      // Response headers
}
```

## 🛡️ Error Handling

The library now includes enhanced error handling with custom error classes:

```typescript
import { WooCommerceApiError, AuthenticationError } from "woocommerce-rest-ts-api";

try {
    const products = await api.getProducts();
} catch (error) {
    if (error instanceof WooCommerceApiError) {
        console.error('API Error:', error.message);
        console.error('Status Code:', error.statusCode);
        console.error('Endpoint:', error.endpoint);
        console.error('Response:', error.response);
    } else if (error instanceof AuthenticationError) {
        console.error('Authentication failed:', error.message);
    }
}
```

## 🛡️ Security Hardening (CVE-2026-44488)

This library fully addresses the high-severity **Axios CVE-2026-44488** ("Allocation of Resources Without Limits or Throttling").

### What was done
- Axios upgraded to **1.18.0** (the secure version that properly enforces body limits under the fetch adapter as well as the http adapter).
- **Resource limits** (`maxContentLength` / `maxBodyLength`) default to 10 MiB in the core `_request` implementation. These are always applied and respected even when users supply `axiosConfig`.
- **Timeout enforcement**: 30 second default timeout is applied when none is configured.
- **Throttling**: `maxConcurrentRequests` option + internal semaphore/queue in the HTTP client.
- **Resilience**: Automatic retries (default 3) using exponential backoff + jitter. 429 responses intelligently respect `Retry-After` headers for rate-limit awareness.

### Configuration example with security options
```typescript
const api = new WooCommerceRestApi({
  url: "https://your-store.com",
  consumerKey: "...",
  consumerSecret: "...",
  // Security / resilience options (all optional; safe defaults applied)
  timeout: 45000,
  maxContentLength: 5 * 1024 * 1024,   // 5MB responses
  maxBodyLength: 2 * 1024 * 1024,      // 2MB uploads
  maxConcurrentRequests: 4,            // Throttle to 4 parallel requests
  retryConfig: {
    retries: 3,  // Enable for resilience (default 0 for strict backward compat)
    retryDelay: 800,
    retryOn: [429, 500, 502, 503, 504]
  },
  // You can still pass raw axios options (they take precedence for provided keys)
  axiosConfig: {
    // headers, adapter, etc.
  }
});
```

**Recommendation**: Leave the size limits at their defaults (or lower them) unless you have a legitimate need for very large payloads. Never set to `-1` in untrusted environments.

The implementation lives in the `_request` method and honors values passed through `axiosConfig` while providing safe library-level guardrails.

### Dev / Release Tooling Security
The project performed a complete audit for [Dependabot #91](https://github.com/advisories/GHSA-2w6w-674q-4c4q) (Handlebars.js "JavaScript Injection via AST Type Confusion", CVE-2026-33937). `handlebars` is **not used** by this library for any templating, error messages, logs, or dynamic content (runtime or tests). It exists only as an indirect devDependency of `conventional-changelog-writer` (used by semantic-release to produce changelog entries from commit messages at release time, using only trusted inputs). 

To resolve the vulnerability in the tooling chain:
- Added top-level `"overrides": { "handlebars": "^4.7.9" }` in `package.json` (supported by both npm and pnpm).
- This pins the secure version (4.7.9+) that includes the necessary AST type validation fixes.
- Updated lockfiles accordingly. No production impact, no code changes required, full backward compatibility preserved.
See the Security section of [CHANGELOG.md](/CHANGELOG.md) for the exhaustive audit details and verification steps performed.

## 📖 API Methods

### Core Methods

#### GET Request
```typescript
const response = await api.get<ProductType[]>("products", { per_page: 10 });
```

#### POST Request
```typescript
const response = await api.post<ProductType>("products", productData);
```

#### PUT Request
```typescript
const response = await api.put<ProductType>("products", updateData, { id: 123 });
```

#### DELETE Request
```typescript
const response = await api.delete<ProductType>("products", { force: true }, { id: 123 });
```

#### OPTIONS Request
```typescript
const response = await api.options("products");
```

### 🚀 Convenience Methods

#### Products

```typescript
// Get all products with type safety
const products = await api.getProducts({ per_page: 20, status: 'publish' });

// Get a single product
const product = await api.getProduct(123);

// Create a new product
const newProduct = await api.createProduct({
    name: "New Product",
    type: "simple",
    regular_price: "29.99"
});

// Update a product
const updatedProduct = await api.updateProduct(123, {
    name: "Updated Product Name"
});
```

#### Orders

```typescript
// Get all orders
const orders = await api.getOrders({ status: 'processing' });

// Get a single order
const order = await api.getOrder(123);

// Create a new order
const newOrder = await api.createOrder({
    payment_method: "bacs",
    billing: {
        first_name: "John",
        last_name: "Doe",
        // ... other billing details
    },
    line_items: [
        {
            product_id: 93,
            quantity: 2
        }
    ]
});
```

#### Customers

```typescript
// Get all customers
const customers = await api.getCustomers();

// Get a single customer
const customer = await api.getCustomer(123);
```

#### Other Endpoints

```typescript
// Get coupons
const coupons = await api.getCoupons();

// Get system status
const systemStatus = await api.getSystemStatus();
```

## 💡 Usage Examples

### Complete Product Management Example

```typescript
import WooCommerceRestApi, { 
    WooRestApiOptions, 
    Products, 
    WooCommerceApiError 
} from "woocommerce-rest-ts-api";

const api = new WooCommerceRestApi({
    url: "https://your-store.com",
    consumerKey: "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    consumerSecret: "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    version: "wc/v3"
});

async function manageProducts() {
    try {
        // List products with pagination
        const products = await api.getProducts({
            per_page: 20,
            page: 1,
            status: 'publish'
        });
        
        console.log(`Found ${products.data.length} products`);
        console.log(`Total pages: ${products.headers['x-wp-totalpages']}`);
        
        // Create a new product
        const newProduct = await api.createProduct({
            name: "Premium Quality Product",
            type: "simple",
            regular_price: "29.99",
            description: "A premium quality product description",
            short_description: "Premium quality product",
            categories: [{ id: 9 }],
            images: [{
                src: "https://example.com/image.jpg"
            }]
        });
        
        console.log(`Created product with ID: ${newProduct.data.id}`);
        
        // Update the product
        const updatedProduct = await api.updateProduct(newProduct.data.id, {
            regular_price: "39.99",
            sale_price: "34.99"
        });
        
        console.log(`Updated product price to: ${updatedProduct.data.regular_price}`);
        
    } catch (error) {
        if (error instanceof WooCommerceApiError) {
            console.error(`API Error: ${error.message} (Status: ${error.statusCode})`);
        } else {
            console.error('Unexpected error:', error);
        }
    }
}

manageProducts();
```

### Order Management Example

```typescript
async function manageOrders() {
    try {
        // Get recent orders
        const orders = await api.getOrders({
            status: 'processing',
            orderby: 'date',
            order: 'desc',
            per_page: 10
        });
        
        console.log(`Found ${orders.data.length} processing orders`);
        
        // Create a new order
        const newOrder = await api.createOrder({
            payment_method: "bacs",
            payment_method_title: "Direct Bank Transfer",
            set_paid: true,
            billing: {
                first_name: "John",
                last_name: "Doe",
                address_1: "969 Market",
                city: "San Francisco",
                state: "CA",
                postcode: "94103",
                country: "US",
                email: "john.doe@example.com",
                phone: "555-555-5555"
            },
            line_items: [
                {
                    product_id: 93,
                    quantity: 2
                }
            ]
        });
        
        console.log(`Created order with ID: ${newOrder.data.id}`);
        
    } catch (error) {
        if (error instanceof WooCommerceApiError) {
            console.error(`Order creation failed: ${error.message}`);
        }
    }
}
```

## 🔍 Type Definitions

The library includes comprehensive TypeScript definitions for all WooCommerce entities:

- `Products` - Product data structure
- `Orders` - Order data structure  
- `Customers` - Customer data structure
- `Coupons` - Coupon data structure
- `SystemStatus` - System status data structure
- And many more...

## 🐛 Error Types

- `WooCommerceApiError` - General API errors with status codes and response data
- `AuthenticationError` - Authentication-specific errors
- `OptionsException` - Configuration/setup errors

## 🏗️ Migration from Previous Versions

If you're upgrading from an earlier version, note these changes:

### From v7.1.x to v7.1.2+ (Security Release)
- **No Breaking Changes**: Fully backward compatible. New security/resilience options (`max*Length`, `maxConcurrentRequests`, `retryConfig`) are optional.
- **Axios Upgrade**: `axios` is now ^1.18.0. All prior `axiosConfig` usage continues to work.
- **Improved Resilience (opt-in controls)**: Timeouts, body limits, throttling and retries are now active with safe defaults. Existing behavior for explicitly supplied `timeout` etc. is preserved.

### From v7.0.x to v7.1.0
- **No Breaking Changes**: v7.1.0 is fully backward compatible
- **Improved Stability**: Better build process and dependency management
- **Enhanced Tooling**: Updated TypeScript and ESLint configurations

### From v6.x and earlier
1. **Response Structure**: All methods now return `WooCommerceApiResponse<T>` instead of raw Axios responses
2. **Error Handling**: New custom error classes replace generic errors
3. **Convenience Methods**: New methods like `getProducts()`, `getOrders()` etc. are available
4. **Type Safety**: Better TypeScript support with generic types

## 📊 Changelog

### v7.1.2 (Security)
- 🛡️ **CVE-2026-44488**: Axios upgraded to 1.18.0. Full implementation of request throttling, enforced timeouts (default 30s), 10MB body size limits, and exponential backoff retry logic (opt-in via retryConfig, default 0 for compat) inside `_request` + `axiosConfig`.
- All existing authentication, convenience methods, and error handling remain 100% backward compatible.
- Added `maxContentLength`, `maxBodyLength`, `maxConcurrentRequests`, `retryConfig` options + comprehensive docs + CHANGELOG.
- Verified: clean build, type-check, lint, and tests.

### v7.1.0 (Previous)
- ✨ Added enhanced error handling with custom error classes
- 🔧 Improved type safety with `WooCommerceApiResponse<T>`
- 🚀 Added convenience methods for common operations
- 📦 Fixed TypeScript configuration issues and ESLint compatibility
- 🛡️ Better input validation and error messages
- 🔧 Resolved build and publishing pipeline issues
- 📝 Updated to TypeScript 5.8.3 with latest dependencies
- 🎯 Improved developer experience with better tooling

[See full changelog](https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib/blob/main/CHANGELOG.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Thanks / Credits

- [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Axios HTTP Client](https://github.com/axios/axios)
- [TypeScript](https://www.typescriptlang.org/)
- [OAuth 1.0a](https://www.npmjs.com/package/oauth-1.0a)

## 📞 Support & Contact

If you need help or have questions, please:

1. Check the [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
2. Open an [issue on GitHub](https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib/issues)
3. Contact via email (use subject: "WooCommerce TS Library - [Your Issue]")

|  Name |  Email | 
|-------|--------|
|  Yuri Lima | y.m.lima19@gmail.com  |

---

**Made with ❤️ by [Yuri Lima](https://yurilima.uk)**
