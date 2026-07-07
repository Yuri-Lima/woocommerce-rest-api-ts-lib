/**
 * RetryStrategy tests — exponential backoff with jitter + 429 Retry-After.
 * Uses nock to simulate transient failures hermetically.
 */
import nock from "nock";
import {
    ExponentialBackoffRetryStrategy,
    createDefaultRetryStrategy,
} from "../http/RetryStrategy";

const BASE = "https://retry.example";

describe("RetryStrategy", () => {
    afterEach(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    beforeEach(() => {
        nock.disableNetConnect();
    });

    test("createDefaultRetryStrategy returns ExponentialBackoffRetryStrategy", () => {
        const s = createDefaultRetryStrategy({ retries: 1, retryDelay: 1 });
        expect(s).toBeInstanceOf(ExponentialBackoffRetryStrategy);
    });

    test("succeeds on first attempt without retry", async () => {
        nock(BASE).get("/ok").reply(200, { ok: true });
        const strategy = new ExponentialBackoffRetryStrategy({ retries: 2, retryDelay: 1 });
        const res = await strategy.executeWithRetry({ method: "GET", url: `${BASE}/ok` });
        expect(res.status).toBe(200);
        expect(res.data).toEqual({ ok: true });
    });

    test("retries retryable 503 then succeeds", async () => {
        nock(BASE)
            .get("/flaky")
            .reply(503, { message: "unavailable" })
            .get("/flaky")
            .reply(200, { ok: true });

        const strategy = new ExponentialBackoffRetryStrategy({
            retries: 2,
            retryDelay: 5,
            retryOn: [503],
        });
        const res = await strategy.executeWithRetry({ method: "GET", url: `${BASE}/flaky` });
        expect(res.status).toBe(200);
        expect(res.data).toEqual({ ok: true });
    });

    test("does not retry non-retryable 400", async () => {
        nock(BASE).get("/bad").reply(400, { message: "bad request" });
        const strategy = new ExponentialBackoffRetryStrategy({
            retries: 3,
            retryDelay: 1,
            retryOn: [503],
        });
        await expect(
            strategy.executeWithRetry({ method: "GET", url: `${BASE}/bad` }),
        ).rejects.toMatchObject({ response: { status: 400 } });
    });

    test("honors Retry-After seconds on 429", async () => {
        nock(BASE)
            .get("/rate")
            .reply(429, { message: "slow down" }, { "retry-after": "0" })
            .get("/rate")
            .reply(200, { ok: true });

        const strategy = new ExponentialBackoffRetryStrategy({
            retries: 1,
            retryDelay: 1,
            retryOn: [429],
        });
        const started = Date.now();
        const res = await strategy.executeWithRetry({ method: "GET", url: `${BASE}/rate` });
        expect(res.status).toBe(200);
        // Should complete quickly because retry-after is 0 and base delay is tiny
        expect(Date.now() - started).toBeLessThan(5000);
    });

    test("exhausts retries and throws last error", async () => {
        nock(BASE)
            .get("/always-fail")
            .times(3)
            .reply(502, { message: "bad gateway" });

        const strategy = new ExponentialBackoffRetryStrategy({
            retries: 2,
            retryDelay: 1,
            retryOn: [502],
        });
        await expect(
            strategy.executeWithRetry({ method: "GET", url: `${BASE}/always-fail` }),
        ).rejects.toMatchObject({ response: { status: 502 } });
    });
});
