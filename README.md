[![Updates Test CI](https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib/actions/workflows/updates.test.yml/badge.svg?branch=main)](https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib/actions/workflows/updates.test.yml)
![npm](https://img.shields.io/npm/v/woocommerce-rest-ts-api)
![npm](https://img.shields.io/npm/dt/woocommerce-rest-ts-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Known Vulnerabilities](https://snyk.io/test/github/Yuri-Lima/woocommerce-rest-api-ts-lib/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Yuri-Lima/woocommerce-rest-api-ts-lib?targetFile=package.json)

<div align="center" width="100%">
    <img src="./images/woocommerce-wordpress-logo.png" width="128" alt="woocommerce_integration_api" />
</div>

# WooCommerce REST API - TypeScript Library

A modern, type-safe TypeScript library for the WooCommerce REST API with enhanced error handling, improved type safety, and convenient methods for common operations.

✨ **New Features in v7.0.2:**
- 🛡️ **Enhanced Error Handling** - Custom error classes with detailed error information
- 🔧 **Improved Type Safety** - Better response typing with `WooCommerceApiResponse<T>`
- 🚀 **Convenience Methods** - Easy-to-use methods for common operations
- 📦 **Modern Module Support** - Full ESM and CJS compatibility
- 🎯 **Better Developer Experience** - Comprehensive TypeScript support

New TypeScript library for WooCommerce REST API. Supports CommonJS (CJS) and ECMAScript (ESM)

## 🚀 Key Features

- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Modern**: ES2020+ with async/await support
- **Flexible**: Support for both CommonJS and ES modules
- **Secure**: Built-in OAuth 1.0a authentication
- **Error Handling**: Custom error classes with detailed error information
- **Convenience Methods**: Easy-to-use methods for common operations
- **Lightweight**: Minimal dependencies with tree-shaking support

## 🔧 Installation

```bash
npm install --save woocommerce-rest-ts-api
```

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
| `port`            | `string`  | no       | Provide support for URLs with ports, eg: `8080`                                                                     |
| `timeout`         | `Integer` | no       | Define the request timeout                                                                                          |
| `axiosConfig`     | `Object`  | no       | Define the custom [Axios config](https://github.com/axios/axios#request-config), also override this library options |

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

1. **Response Structure**: All methods now return `WooCommerceApiResponse<T>` instead of raw Axios responses
2. **Error Handling**: New custom error classes replace generic errors
3. **Convenience Methods**: New methods like `getProducts()`, `getOrders()` etc. are available
4. **Type Safety**: Better TypeScript support with generic types

## 📊 Changelog

### v7.0.2 (Latest)
- ✨ Added enhanced error handling with custom error classes
- 🔧 Improved type safety with `WooCommerceApiResponse<T>`
- 🚀 Added convenience methods for common operations
- 📦 Fixed TypeScript configuration issues
- 🛡️ Better input validation and error messages

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
