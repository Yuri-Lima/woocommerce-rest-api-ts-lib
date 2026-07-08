/**
 * Store API errors — separate from admin REST (woocommerce-rest-ts-api) errors.
 */

export class StoreApiOptionsError extends Error {
  readonly name = "StoreApiOptionsError";

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StoreApiError extends Error {
  readonly name = "StoreApiError";
  readonly status?: number;
  readonly code?: string;
  readonly data?: unknown;
  /** True when session/token/nonce recovery may help. */
  readonly isSessionError: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      data?: unknown;
      isSessionError?: boolean;
    } = {},
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = options.status;
    this.code = options.code;
    this.data = options.data;
    this.isSessionError = options.isSessionError ?? false;
  }
}

export function isSessionRelatedCode(code?: string, status?: number): boolean {
  if (status === 401 || status === 403) return true;
  if (!code) return false;
  const c = code.toLowerCase();
  return (
    c.includes("nonce") ||
    c.includes("cart_token") ||
    c.includes("invalid_token") ||
    c.includes("not_authenticated") ||
    c.includes("rest_cookie")
  );
}
