[![Updates Test CI](https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib/actions/workflows/updates.test.yml/badge.svg?branch=main)](https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib/actions/workflows/updates.test.yml)
![npm](https://img.shields.io/npm/v/woocommerce-rest-ts-api)
![npm](https://img.shields.io/npm/dt/woocommerce-rest-ts-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Known Vulnerabilities](https://snyk.io/test/github/Yuri-Lima/woocommerce-rest-api-ts-lib/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Yuri-Lima/woocommerce-rest-api-ts-lib?targetFile=package.json)

<div align="center" width="100%">
    <img src="./images/woocommerce-wordpress-logo.png" width="128" alt="woocommerce_integration_api" />
</div>

# WooCommerce REST API - TypeScript Library

This is alternative library which provides a set of TypeScript classes that can be used to interact with the WooCommerce REST API.
`However, it is not a complete implementation of the API, but rather a subset of the API that is useful for.`

New TypeScript library for WooCommerce REST API. Supports CommonJS (CJS) and ECMAScript (ESM)

## Fixing the issues [Triggered Date: 2022-11-15]
1. This new package was to fixe the issue with the official [WooCommerce REST API JavaScript library](https://github.com/woocommerce/woocommerce-rest-api-js-lib), which is not compatible with the security features for some packages used for.
2. **Axios** package used by them, had a `Cricital vulnerability` which seems not beeing updated often.

Requests are made with [Axios library](https://github.com/axios/axios) with [support to promises](https://github.com/axios/axios#promises).

## Installation

```
npm install --save woocommerce-rest-ts-api
```

## Getting started

Generate API credentials (Consumer Key & Consumer Secret) following this instructions <http://docs.woocommerce.com/document/woocommerce-rest-api/>
.

Check out the WooCommerce API endpoints and data that can be manipulated in <http://woocommerce.github.io/woocommerce-rest-api-docs/>.

## Setup

### ESM example:

```ts
import WooCommerceRestApi,{WooRestApiOptions} from "woocommerce-rest-ts-api";
const opt:WooRestApiOptions = {
    url: "http://example.com" ,
    consumerKey:  "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    consumerSecret:  "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    version: "wc/v3",
    queryStringAuth: false // Force Basic Authentication as query string true and using under
}
const api = new WooCommerceRestApi(opt);
```

### CJS example:

```js
const WooCommerceRestApi = require("woocommerce-rest-ts-api").default;

const api = new WooCommerceRestApi({
  url: "http://example.com",
  consumerKey: "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  consumerSecret: "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  version: "wc/v3",
  queryStringAuth: false // Force Basic Authentication as query string true and using under HTTPS
});
```

### Options

| Option            | Type      | Required | Description                                                                                                         |
|-------------------|-----------|----------|---------------------------------------------------------------------------------------------------------------------|
| `url`             | `String`  | yes      | Your Store URL, example: http://woo.dev/                                                                            |
| `consumerKey`     | `String`  | yes      | Your API consumer key                                                                                               |
| `consumerSecret`  | `String`  | yes      | Your API consumer secret                                                                                            |
| `wpAPIPrefix`     | `String`  | no       | Custom WP REST API URL prefix, used to support custom prefixes created with the `rest_url_prefix` filter            |
| `version`         | `String`  | no       | API version, default is `v3`                                                                                        |
| `encoding`        | `String`  | no       | Encoding, default is 'utf-8'                                                                                        |
| `queryStringAuth` | `Bool`    | no       | When `true` and using under HTTPS force Basic Authentication as query string, default is `false`                    |
| `port`            | `string`  | no       | Provide support for URLs with ports, eg: `8080`                                                                     |
| `timeout`         | `Integer` | no       | Define the request timeout                                                                                          |
| `axiosConfig`     | `Object`  | no       | Define the custom [Axios config](https://github.com/axios/axios#request-config), also override this library options |

## Methods

### GET <T extends WooRestApiEndpoint>

- `.get(endpoint)`
- `.get(endpoint, params)`
- params?: Partial<WooRestApiParams>

| Params     | Type     | Description                                                   |
|------------|----------|---------------------------------------------------------------|
| `endpoint` | `String` | WooCommerce API endpoint, example: `customers` or `orders/12` |
| `params`   | `Object` | Query strings params, example: `{ per_page: 20 }`             |

### POST <T extends WooRestApiEndpoint>

- `.post(endpoint, data)`
- `.post(endpoint, data, params)`
- data: Record<string, unknown>
- params?: Partial<WooRestApiParams>

| Params     | Type     | Description                                                 |
|------------|----------|-------------------------------------------------------------|
| `endpoint` | `String` | WooCommerce API endpoint, example: `customers` or `orders`  |
| `data`     | `Object` | JS object to be converted into JSON and sent in the request |
| `params`   | `Object` | Query strings params                                        |

### PUT <T extends WooRestApiEndpoint>

- `.put(endpoint, data)`
- `.put(endpoint, data, params)`
- data: Record<string, unknown>
- params?: Partial<WooRestApiParams>

| Params     | Type     | Description                                                       |
|------------|----------|-------------------------------------------------------------------|
| `endpoint` | `String` | WooCommerce API endpoint, example: `customers/1` or `orders/1234` |
| `data`     | `Object` | JS object to be converted into JSON and sent in the request       |
| `params`   | `Object` | Query strings params                                              |

### DELETE <T extends WooRestApiEndpoint>

- `.delete(endpoint)`
- `.delete(endpoint, params)`
- data: Pick<WooRestApiParams, "force">,
- params: Pick<WooRestApiParams, "id">

| Params     | Type     | Description                                                     |
|------------|----------|-----------------------------------------------------------------|
| `endpoint` | `String` | WooCommerce API endpoint, example: `customers/2` or `orders/12` |
| `params`   | `Object` | Query strings params, example: `{ force: true }`                |

### OPTIONS <T extends WooRestApiEndpoint>

- `.options(endpoint)`
- `.options(endpoint, params)`
- params?: Partial<WooRestApiParams>

| Params     | Type     | Description                                                     |
|------------|----------|-----------------------------------------------------------------|
| `endpoint` | `String` | WooCommerce API endpoint, example: `customers/2` or `orders/12` |
| `params`   | `Object` | Query strings params                                            |

## Example of use

```ts
import WooCommerceRestApi,{CouponsParams, ProductsMainParams, OrdersMainParams, WooRestApiOptions} from "woocommerce-rest-ts-api";
// const WooCommerceRestApi = require("woocommerce-rest-ts-api").default;

const api = new WooCommerceRestApi({
  url: "http://example.com",
  consumerKey: "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  consumerSecret: "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  version: "wc/v3",
  queryStringAuth: false // Force Basic Authentication as query string true and using under HTTPS
});

// List products
const products = await api.get("products", {
  per_page: 20, // 20 products per page
});
products.status; // 200
product.headers.get('x-wp-totalpages')
products.headers.get('x-wp-total')
products.headers.forEach((header) => {
  console.log(header);
});
products.data.forEach((product) => {
  console.log(product.name);
});

// Create a product
// See more in https://woocommerce.github.io/woocommerce-rest-api-docs/#product-properties
const data:ProductsMainParams = {
            name: "Premium Quality",
            type: "simple",
            regular_price: "21.99",
            description: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.",
            short_description: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
            categories: [
                {
                    id: 9
                },
                {
                    id: 14
                }
            ],
            images: [
                {
                    src: "http://demo.woothemes.com/woocommerce/wp-content/uploads/sites/56/2013/06/T_2_front.jpg"
                },
                {
                    src: "http://demo.woothemes.com/woocommerce/wp-content/uploads/sites/56/2013/06/T_2_back.jpg"
                }
            ]
        };
const products = await api.post("products", data);
products.status; // 201
products.data; // { id: 11, ... }
products.headers.get('x-wp-totalpages')
products.headers.get('x-wp-total')

// Edit/Update a product
  const data:ProductsMainParams = {
      name: "Premium Quality Updated-" + randomstring.generate({length:4, capitalization:"uppercase", charset: "alphanumeric"}),
      type: "simple",
      regular_price: "30.22",
      description: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.",
      short_description: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
      categories: [
          {
              id: 9
          },
          {
              id: 14
          }
      ],
      images: [
          {
              src: "http://demo.woothemes.com/woocommerce/wp-content/uploads/sites/56/2013/06/T_2_front.jpg"
          },
          {
              src: "http://demo.woothemes.com/woocommerce/wp-content/uploads/sites/56/2013/06/T_2_back.jpg"
          }
      ]
  };
  const products = await api.put("products", data, {id: 11});
  products.status; // 201
  products.data; // { id: 11, ... }
  products.headers.get('x-wp-totalpages')
  products.headers.get('x-wp-total')

// Delete a product
const products = await wooCommerce.delete("products", {force: true}, {id: 11});
products.status; // 201
products.data; // { id: 11, ... }
products.headers.get('x-wp-totalpages')
products.headers.get('x-wp-total')

// Create a order
const data:OrdersMainParams = {
      payment_method: "bacs",
      payment_method_title: "Direct Bank Transfer",
      set_paid: true,
      billing: {
          first_name: `John ${Math.random()}`,
          last_name: "Doe",
          address_1: "969 Market",
          address_2: "",
          city: "San Francisco",
          state: "CA",
          postcode: "94103",
          country: "US",
          email: "john.doe@example.com",
          phone: "85996859001",
          company: "WooCommerce"
      },
      shipping: {
          first_name: "John",
          last_name: "Doe",
          address_1: "969 Market",
          address_2: "",
          city: "San Francisco",
          state: "CA",
          postcode: "94103",
          country: "US",
          company: "WooCommerce"
      },
      line_items: [
          {
              product_id: 93,
              quantity: 2
          },
          {
              product_id: 22,
              variation_id: 23,
              quantity: 1
          }
      ],
      shipping_lines: [
          {
              method_id: "flat_rate",
              method_title: "Flat Rate",
              total: "10.00"
          }
      ]
  };
const order = await api.post("orders", data);
order.status; // 201
order.data; // { id: 11, ... }
order.headers.get('x-wp-totalpages')
order.headers.get('x-wp-total')

// Edit/Update a order
const data:OrdersMainParams = {
      payment_method: "bacs",
      payment_method_title: "Direct Bank Transfer",
      set_paid: true,
      billing: {
          first_name: `Yuri ${Math.random()}`,
          last_name: "Doe",
          address_1: "969 Market",
          address_2: "",
          city: "San Francisco",
      },
  };
const order = await api.put("orders", data, {id: 11});
order.status; // 201
order.data; // { id: 11, ... }
order.headers.get('x-wp-totalpages')
order.headers.get('x-wp-total')

// Delete a order
const order = await api.delete("orders", {force: true}, {id: 11});
order.status; // 201
order.data; // { id: 11, ... }
order.headers.get('x-wp-totalpages')
order.headers.get('x-wp-total')
```

## Changelog

[See changelog for details](https://github.com/woocommerce/woocommerce-rest-api-js-lib/blob/master/CHANGELOG.md)

## Thanks / Credits / Bibliography
- [snyk - Best Pratice Guide](https://snyk.io/blog/best-practices-create-modern-npm-package/)
- [woocommerce](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [dennismphil - Updates dependencies](https://dev.to/dennismphil/automate-your-node-dependency-updates-4aga)
- [emojis](https://www.webfx.com/tools/emoji-cheat-sheet/)
- [eslint-for-typescript](https://khalilstemmler.com/blogs/typescript/eslint-for-typescript/)
- [Yoni Goldberg’s - Tests](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Ben Awad - Generic Types](https://youtu.be/nViEqpgwxHE)
- [Anthony Fu - Publish ESM and CJS in a single package](https://antfu.me/posts/publish-esm-and-cjs)
- [Semantic Releases - egghead](https://egghead.io/lessons/javascript-automating-releases-with-semantic-release)
- [GH006 Protected Branch Update Failed - paulmowat](https://www.paulmowat.co.uk/blog/resolve-github-action-gh006-protected-branch-update-failed)
- [swizec - jest-with-typescript](https://swizec.com/blog/how-to-configure-jest-with-typescript/)

> ### Contact
**Atention** If you email me, please use as a email subject, the name of the project, in this case: **(WooCommerce TS Library) - INFO**

|  Name |  Email | Mobile/Whatsapp  |
|-------|--------|---------|
|  Yuri Lima | y.m.lima19@gmail.com  | +353 83 419.1605  |
