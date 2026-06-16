/**
 * Error types for the WooCommerce REST API client.
 * Proper Error subclasses (no more plain object OptionsException).
 */

export class WooCommerceApiError extends Error {
    public statusCode?: number;
    public response?: unknown;
    public endpoint?: string;

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
        // Maintains proper stack trace for where error was thrown (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, WooCommerceApiError);
        }
    }
}

export class AuthenticationError extends WooCommerceApiError {
    constructor(message = "Authentication failed") {
        super(message, 401);
        this.name = "AuthenticationError";
    }
}

export class OptionsException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OptionsException";
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, OptionsException);
        }
    }
}
