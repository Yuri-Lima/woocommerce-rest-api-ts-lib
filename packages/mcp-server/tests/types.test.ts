import {
  parseListOutput,
  parseSingleOutput,
  ProductSchema,
  BatchOperationSchema,
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

  it("textContent serializes objects and includes usage", () => {
    const c = textContent({ ok: true });
    expect(c.content[0].text).toMatch(/"ok": true/);
    expect(c.content[0].text).toMatch(/"usage"/);
    expect(c._meta?.["woo.usage"].estimated_response_tokens).toBeGreaterThan(0);
  });
});
