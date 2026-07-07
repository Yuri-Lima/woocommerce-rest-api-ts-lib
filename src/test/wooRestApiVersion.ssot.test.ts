import type { WooRestApiVersion } from "../types/options";
import { sanitizeApiVersion } from "../utils/sanitize";

describe("WooRestApiVersion SSOT", () => {
    test("sanitizeApiVersion returns options WooRestApiVersion", () => {
        const v: WooRestApiVersion = sanitizeApiVersion("wc/v3");
        expect(v).toBe("wc/v3");
    });
});
