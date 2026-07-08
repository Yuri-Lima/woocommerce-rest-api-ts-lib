import {
  parseListOutput,
  parseSingleOutput,
  ProductSchema,
  BatchOperationSchema,
  compactJson,
  resolveListFields,
  PRODUCT_SUMMARY_FIELDS,
  textContent,
} from "../src/types.js";

describe("types helpers", () => {
  it("parseListOutput validates items and pagination", () => {
    const out = parseListOutput(
      [{ id: 1, name: "A" }],
      1,
      10,
      1,
      1,
      ProductSchema,
    );
    expect(out.items[0]).toMatchObject({ id: 1 });
    expect(out.pagination.total).toBe(1);
  });

  it("parseSingleOutput wraps item", () => {
    const out = parseSingleOutput({ id: 2, name: "B" }, ProductSchema);
    expect(out.item).toMatchObject({ id: 2 });
  });

  it("BatchOperationSchema accepts create/update/delete", () => {
    const parsed = BatchOperationSchema.parse({
      create: [{ name: "x" }],
      update: [{ id: 1, name: "y" }],
      delete: [2, 3],
    });
    expect(parsed.delete).toEqual([2, 3]);
  });

  it("textContent serializes compact JSON and includes usage", () => {
    const c = textContent({ ok: true });
    // Compact JSON: no pretty-print spaces after colons/newlines
    expect(c.content[0].text).toMatch(/"ok":true/);
    expect(c.content[0].text).not.toMatch(/\n/);
    expect(c.content[0].text).toMatch(/"usage"/);
    expect(c._meta?.["woo.usage"].estimated_response_tokens).toBeGreaterThan(0);
  });

  it("compactJson is smaller than pretty JSON", () => {
    const payload = {
      items: Array.from({ length: 20 }, (_, i) => ({
        id: i,
        name: `Product ${i}`,
        description: "<p>Long HTML description that agents rarely need in lists</p>",
      })),
    };
    const compact = compactJson(payload);
    const pretty = JSON.stringify(payload, null, 2);
    expect(compact.length).toBeLessThan(pretty.length);
    expect((pretty.length - compact.length) / pretty.length).toBeGreaterThan(0.15);
  });

  it("resolveListFields defaults to summary projection", () => {
    expect(resolveListFields(undefined, undefined, PRODUCT_SUMMARY_FIELDS)).toBe(
      PRODUCT_SUMMARY_FIELDS,
    );
    expect(resolveListFields("summary", undefined, PRODUCT_SUMMARY_FIELDS)).toBe(
      PRODUCT_SUMMARY_FIELDS,
    );
    expect(resolveListFields("full", undefined, PRODUCT_SUMMARY_FIELDS)).toBeUndefined();
    expect(resolveListFields("full", "id,name", PRODUCT_SUMMARY_FIELDS)).toBe("id,name");
    expect(resolveListFields("summary", "id,sku", PRODUCT_SUMMARY_FIELDS)).toBe("id,sku");
  });
});
