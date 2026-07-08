/**
 * MCP-aware error normalization.
 * Converts WooCommerce / Axios / unknown errors into structured tool error payloads
 * instead of dumping raw HTTP stacks to the model.
 */

import { WooCommerceApiError, AuthenticationError, OptionsException } from "woocommerce-rest-ts-api";
import { usageMetaForText } from "./usage.js";

/** Cap error detail blobs so a 50KB WC HTML/JSON error cannot flood the model context. */
export const MAX_ERROR_DETAILS_CHARS = 500;
export const MAX_ERROR_MESSAGE_CHARS = 400;

export interface McpToolErrorPayload {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
  _meta?: ReturnType<typeof usageMetaForText>;
  /** Index signature so results assign to MCP SDK CallToolResult. */
  [key: string]: unknown;
}

export interface NormalizedError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
}

/** Truncate long strings with a visible remainder marker. */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const omitted = text.length - maxChars;
  return `${text.slice(0, maxChars)}…[truncated ${omitted} chars]`;
}

/** Compact + truncate error details for model-facing messages. */
export function formatErrorDetails(
  details: unknown,
  maxChars = MAX_ERROR_DETAILS_CHARS,
): string | undefined {
  if (details === undefined) return undefined;
  let raw: string;
  try {
    raw = typeof details === "string" ? details : JSON.stringify(details);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  return truncateText(raw, maxChars);
}

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

/**
 * Normalize any thrown value into a structured error object.
 */
export function normalizeError(err: unknown): NormalizedError {
  if (err instanceof AuthenticationError) {
    return {
      code: "authentication_error",
      message: messageOf(
        err,
        "WooCommerce authentication failed. Check WC_KEY and WC_SECRET.",
      ),
      status: 401,
    };
  }

  if (err instanceof WooCommerceApiError) {
    const anyErr = err as WooCommerceApiError & {
      response?: { status?: number; data?: unknown };
      statusCode?: number;
      code?: string;
    };
    const maybeStatus = (err as { status?: unknown }).status;
    const status =
      anyErr.statusCode ??
      anyErr.response?.status ??
      (typeof maybeStatus === "number" ? maybeStatus : undefined);
    return {
      code: anyErr.code || "woocommerce_api_error",
      message: messageOf(err, "WooCommerce API request failed"),
      status,
      details: anyErr.response?.data,
    };
  }

  if (err instanceof OptionsException) {
    return {
      code: "options_error",
      message: messageOf(err, "Invalid WooCommerce client options"),
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
          messageOf(err, `HTTP ${axiosLike.response.status} error from WooCommerce`),
        status: axiosLike.response.status,
        details: data,
      };
    }
    return {
      code: axiosLike.code || "internal_error",
      message: messageOf(err, "Internal error"),
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
 * Message and details are length-capped to protect model context / memory.
 */
export function toMcpToolError(err: unknown): McpToolErrorPayload {
  const normalized = normalizeError(err);
  const message = truncateText(normalized.message, MAX_ERROR_MESSAGE_CHARS);
  const parts = [
    `Error [${normalized.code}]${normalized.status ? ` (HTTP ${normalized.status})` : ""}: ${message}`,
  ];
  const details = formatErrorDetails(normalized.details);
  if (details !== undefined) {
    parts.push(`Details: ${details}`);
  }
  const text = parts.join("\n");
  return {
    isError: true,
    content: [{ type: "text", text }],
    _meta: usageMetaForText(text, { is_error: true }),
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
