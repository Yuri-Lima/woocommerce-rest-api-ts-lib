"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./index"));
const nock_1 = __importDefault(require("nock"));
describe("#requests", () => {
    beforeEach(() => {
        nock_1.default.cleanAll();
    });
    const api = new index_1.default({
        url: "https://test.dev",
        consumerKey: "ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        consumerSecret: "cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        version: "wc/v3"
    });
    test("should return content for basic auth", () => {
        expect.assertions(1);
        (0, nock_1.default)(`https://test.dev/wp-json/wc/v3`)
            .post("/orders", {})
            .reply(201, {
            ok: true
        });
        return api.post("orders", {}, { test: "here" }).then(response => {
            console.log("response:", response);
            expect(response.status).toBe(201);
        });
    });
});
