/**
 * Throttler / concurrency limiter tests.
 */
import { ConcurrencyThrottler, createThrottler } from "../http/Throttler";

describe("Throttler", () => {
    test("createThrottler defaults to unlimited (max 0)", async () => {
        const t = createThrottler();
        await t.acquire();
        await t.acquire();
        t.release();
        t.release();
        expect(true).toBe(true);
    });

    test("createThrottler with explicit max", async () => {
        const t = createThrottler(2);
        await t.acquire();
        await t.acquire();
        let thirdDone = false;
        const third = t.acquire().then(() => {
            thirdDone = true;
        });
        await new Promise((r) => setTimeout(r, 10));
        expect(thirdDone).toBe(false);
        t.release();
        await third;
        expect(thirdDone).toBe(true);
        t.release();
        t.release();
    });

    test("negative max is treated as unlimited", async () => {
        const t = new ConcurrencyThrottler(-1);
        await Promise.all([t.acquire(), t.acquire(), t.acquire()]);
        t.release();
        t.release();
        t.release();
    });

    test("FIFO queue order under contention", async () => {
        const t = new ConcurrencyThrottler(1);
        await t.acquire();
        const order: number[] = [];
        const p1 = t.acquire().then(() => order.push(1));
        const p2 = t.acquire().then(() => order.push(2));
        await new Promise((r) => setTimeout(r, 5));
        t.release();
        await p1;
        t.release();
        await p2;
        expect(order).toEqual([1, 2]);
        t.release();
    });

    test("release without waiters is safe", () => {
        const t = new ConcurrencyThrottler(1);
        expect(() => t.release()).not.toThrow();
    });
});
