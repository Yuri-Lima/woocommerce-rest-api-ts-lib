/**
 * Base error for all WooCommerce REST API failures.
 * Carries status, raw response body, and the endpoint for diagnostics.
 */
export class WooCommerceApiError extends Error {
    public readonly statusCode?: number;
    public readonly response?: unknown;
    public readonly endpoint?: string;

    constructor(
        message: string,
        statusCode?: number,
        response?: unknown,
        endpoint?: string,
    ) {
        super(message);
        this.name = "WooCommerceApiError";
        this.statusCode = statusCode;
        this.response = response;
        this.endpoint = endpoint;
        // Maintains proper prototype chain for instanceof in ES5+ targets
        Object.setPrototypeOf(this, WooCommerceApiError.prototype);
    }
}

/**
 * Authentication-specific failure (401/403 patterns or missing creds).
 */
export class AuthenticationError extends WooCommerceApiError {
    constructor(message = "Authentication failed") {
        super(message, 401);
        this.name = "AuthenticationError";
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}

/**
 * Configuration / instantiation error (missing url, key, secret, or invalid values).
 */
export class OptionsException extends Error {
    public readonly name = "OptionsException" as const;

    constructor(message: string) {
        super(message);
        this.name = "OptionsException";
        Object.setPrototypeOf(this, OptionsException.prototype);
    }
}
