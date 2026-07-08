import {
  sanitizeApiVersion,
  sanitizeEndpoint,
  validateBaseUrl,
  createThrottler,
} from "../src/utils.js";
import { StoreApiOptionsError } from "../src/errors.js";
import { StoreApiOptionsError as PublicErr } from "../src/index.js";

describe("utils", () => {
  it("validateBaseUrl accepts http(s)", () => {
    expect(validateBaseUrl("https://shop.example").host).toBe("shop.example");
    expect(() => validateBaseUrl("ftp://x")).toThrow(StoreApiOptionsError);
    expect(() => validateBaseUrl("not-a-url")).toThrow(StoreApiOptionsError);
  });

  it("sanitizeApiVersion accepts wc/store/v1", () => {
    expect(sanitizeApiVersion("wc/store/v1")).toBe("wc/store/v1");
    expect(sanitizeApiVersion("/wc/store/v1/")).toBe("wc/store/v1");
    expect(() => sanitizeApiVersion("wc/store/v1/extra")).toThrow(
      StoreApiOptionsError,
    );
    expect(() => sanitizeApiVersion("../evil")).toThrow(StoreApiOptionsError);
  });

  it("sanitizeEndpoint blocks traversal", () => {
    expect(sanitizeEndpoint("cart/add-item")).toBe("cart/add-item");
    expect(sanitizeEndpoint("products/12")).toBe("products/12");
    expect(() => sanitizeEndpoint("../x")).toThrow(StoreApiOptionsError);
    expect(() => sanitizeEndpoint("/cart")).toThrow(StoreApiOptionsError);
  });

  it("throttler unlimited when max <= 0", async () => {
    const t = createThrottler(0);
    await t.acquire();
    await t.acquire();
    t.release();
    t.release();
  });

  it("throttler limits concurrency", async () => {
    const t = createThrottler(1);
    let running = 0;
    let max = 0;
    const job = async () => {
      await t.acquire();
      running++;
      max = Math.max(max, running);
      await new Promise((r) => setTimeout(r, 15));
      running--;
      t.release();
    };
    await Promise.all([job(), job()]);
    expect(max).toBe(1);
  });

  it("public error class is available", () => {
    expect(new PublicErr("x")).toBeInstanceOf(Error);
  });
});
