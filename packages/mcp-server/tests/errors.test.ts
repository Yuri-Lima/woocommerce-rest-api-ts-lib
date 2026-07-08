import {
  normalizeError,
  toMcpToolError,
  withToolErrorHandling,
} from "../src/errors.js";
import {
  WooCommerceApiError,
  AuthenticationError,
  OptionsException,
} from "woocommerce-rest-ts-api";

describe("normalizeError", () => {
  it("handles AuthenticationError", () => {
    const n = normalizeError(new AuthenticationError("bad creds"));
    expect(n.code).toBe("authentication_error");
    expect(n.status).toBe(401);
    expect(n.message).toMatch(/bad creds/);
  });

  it("handles WooCommerceApiError", () => {
    const err = new WooCommerceApiError("not found");
    const n = normalizeError(err);
    expect(n.code).toBe("woocommerce_api_error");
    expect(n.message).toMatch(/not found/);
  });

  it("handles OptionsException", () => {
    const n = normalizeError(new OptionsException("url is required"));
    expect(n.code).toBe("options_error");
  });

  it("handles generic Error", () => {
    const n = normalizeError(new Error("boom"));
    expect(n.code).toBe("internal_error");
    expect(n.message).toBe("boom");
  });

  it("handles axios-like errors with response", () => {
    const err = Object.assign(new Error("Request failed"), {
      response: { status: 404, data: { code: "not_found", message: "Missing" } },
    });
    const n = normalizeError(err);
    expect(n.status).toBe(404);
    expect(n.code).toBe("not_found");
    expect(n.message).toBe("Missing");
  });

  it("handles string errors", () => {
    const n = normalizeError("plain string");
    expect(n.code).toBe("unknown_error");
    expect(n.message).toBe("plain string");
  });
});

describe("toMcpToolError", () => {
  it("returns isError payload with structured text", () => {
    const payload = toMcpToolError(new Error("fail"));
    expect(payload.isError).toBe(true);
    expect(payload.content[0].type).toBe("text");
    expect(payload.content[0].text).toMatch(/fail/);
  });

  it("truncates oversized error details", () => {
    const err = Object.assign(new Error("Request failed"), {
      response: {
        status: 500,
        data: {
          code: "internal_server_error",
          message: "Boom",
          data: { html: "x".repeat(5000) },
        },
      },
    });
    const payload = toMcpToolError(err);
    expect(payload.content[0].text.length).toBeLessThan(1200);
    expect(payload.content[0].text).toMatch(/truncated/);
  });
});

describe("withToolErrorHandling", () => {
  it("returns handler result on success", async () => {
    const wrapped = withToolErrorHandling(async (x: number) => x * 2);
    await expect(wrapped(3)).resolves.toBe(6);
  });

  it("returns MCP error on throw", async () => {
    const wrapped = withToolErrorHandling(async () => {
      throw new Error("nope");
    });
    const result = await wrapped(undefined);
    expect(result).toMatchObject({ isError: true });
  });
});
