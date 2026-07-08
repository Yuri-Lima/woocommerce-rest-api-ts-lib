import {
  CartSession,
  MemorySessionStore,
  isSessionRelatedCode,
} from "../src/index.js";

describe("MemorySessionStore + CartSession", () => {
  it("stores and returns cart token and nonce", async () => {
    const store = new MemorySessionStore();
    const session = new CartSession(store);
    await session.absorbResponseHeaders({
      "Cart-Token": "tok-1",
      Nonce: "n-1",
    });
    expect(await session.getCartToken()).toBe("tok-1");
    expect(await session.getNonce()).toBe("n-1");
  });

  it("prefers Cart-Token over Nonce in request headers", async () => {
    const session = new CartSession(
      new MemorySessionStore({ cartToken: "t", nonce: "n" }),
    );
    const headers = await session.getRequestHeaders();
    expect(headers["Cart-Token"]).toBe("t");
    expect(headers["Nonce"]).toBeUndefined();
  });

  it("sends Nonce when no Cart-Token", async () => {
    const session = new CartSession(
      new MemorySessionStore({ cartToken: null, nonce: "n-only" }),
    );
    const headers = await session.getRequestHeaders();
    expect(headers["Nonce"]).toBe("n-only");
    expect(headers["Cart-Token"]).toBeUndefined();
  });

  it("is case-insensitive for response headers", async () => {
    const session = new CartSession(new MemorySessionStore());
    await session.absorbResponseHeaders({
      "cart-token": "lower",
      nonce: "n2",
    });
    expect(await session.getCartToken()).toBe("lower");
    expect(await session.getNonce()).toBe("n2");
  });

  it("clears session", async () => {
    const session = new CartSession(
      new MemorySessionStore({ cartToken: "x", nonce: "y" }),
    );
    await session.clear();
    expect(await session.getCartToken()).toBeNull();
    expect(await session.getNonce()).toBeNull();
  });
});

describe("isSessionRelatedCode", () => {
  it("flags nonce and 403", () => {
    expect(isSessionRelatedCode("woocommerce_rest_invalid_nonce", 403)).toBe(
      true,
    );
    expect(isSessionRelatedCode(undefined, 403)).toBe(true);
    expect(isSessionRelatedCode("not_found", 404)).toBe(false);
  });
});
