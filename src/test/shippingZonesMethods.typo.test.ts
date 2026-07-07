import type { ShippingZonesMethods } from "../types";

describe("ShippingZonesMethods instance_id", () => {
    test("accepts correct instance_id and deprecated instace_id alias", () => {
        const method: ShippingZonesMethods = {
            instance_id: 7,
            instace_id: 7,
            title: "Flat rate",
            method_id: "flat_rate",
        };
        expect(method.instance_id).toBe(7);
        expect(method.instace_id).toBe(7);
    });
});
