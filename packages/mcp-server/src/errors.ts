/**
 * MCP-aware error normalization.
 * Converts WooCommerce / Axios / unknown errors into structured tool error payloads
 * instead of dumping raw HTTP stacks to the model.
 */

import { WooCommerceApiError, AuthenticationError, OptionsException } from "woocommerce-rest-ts-api";

export interface McpToolErrorPayload {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
}

export interface NormalizedError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
}

/**
 * Normalize any thrown value into a structured error object.
 */
export function normalizeError(err: unknown): NormalizedError {
  if (err instanceof AuthenticationError) {
    return {
      code: "authentication_error",
      message:
        err.message ||
        "WooCommerce authentication failed. Check WC_KEY and WC_SECRET.",
      status: 401,
    };
  }

  if (err instanceof WooCommerceApiError) {
    const anyErr = err as WooCommerceApiError & {
      response?: { status?: number; data?: unknown };
      statusCode?: number;
      code?: string;
    };
    const status =
      anyErr.statusCode ??
      anyErr.response?.status ??
      (typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : undefined);
    return {
      code: anyErr.code || "woocommerce_api_error",
      message: err.message || "WooCommerce API request failed",
      status,
      details: anyErr.response?.data,
    };
  }

  if (err instanceof OptionsException) {
    return {
      code: "options_error",
      message: err.message || "Invalid WooCommerce client options",
    };
  }

  if (err instanceof Error) {
    // Axios-style errors often carry response
    const axiosLike = err as Error & {
      response?: { status?: number; data?: { message?: string; code?: string } };
      code?: string;
      status?: number;
    };
    if (axiosLike.response) {
      const data = axiosLike.response.data;
      return {
        code: data?.code || axiosLike.code || "http_error",
        message:
          data?.message ||
          err.message ||
          `HTTP ${axiosLike.response.status} error from WooCommerce`,
        status: axiosLike.response.status,
        details: data,
      };
    }
    return {
      code: axiosLike.code || "internal_error",
      message: err.message,
      status: axiosLike.status,
    };
  }

  return {
    code: "unknown_error",
    message: typeof err === "string" ? err : "An unknown error occurred",
  };
}

/**
 * Format a normalized error as an MCP tool error result.
 */
export function toMcpToolError(err: unknown): McpToolErrorPayload {
  const normalized = normalizeError(err);
  const parts = [
    `Error [${normalized.code}]${normalized.status ? ` (HTTP ${normalized.status})` : ""}: ${normalized.message}`,
  ];
  if (normalized.details !== undefined) {
    try {
      parts.push(`Details: ${JSON.stringify(normalized.details)}`);
    } catch {
      // ignore non-serializable details
    }
  }
  return {
    isError: true,
    content: [{ type: "text", text: parts.join("\n") }],
  };
}

/**
 * Wrap an async tool handler so uncaught errors become MCP tool errors.
 */
export function withToolErrorHandling<TArgs, TResult>(
  handler: (args: TArgs) => Promise<TResult>,
): (args: TArgs) => Promise<TResult | McpToolErrorPayload> {
  return async (args: TArgs) => {
    try {
      return await handler(args);
    } catch (err) {
      return toMcpToolError(err);
    }
  };
}
