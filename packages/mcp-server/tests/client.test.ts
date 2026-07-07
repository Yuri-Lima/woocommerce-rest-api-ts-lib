import nock from "nock";
import {
  ConcurrencyThrottler,
  RateLimiter,
  createWooClient,
} from "../src/client.js";
import { testConfig, TEST_BASE, apiPath } from "./helpers.js";

describe("ConcurrencyThrottler", () => {
  it("allows unlimited when max <= 0", async () => {
    const t = new ConcurrencyThrottler(0);
    await t.acquire();
    await t.acquire();
    t.release();
    t.release();
  });

  it("limits concurrency", async () => {
    const t = new ConcurrencyThrottler(1);
    let running = 0;
    let maxRunning = 0;

    const task = async () => {
      await t.acquire();
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running--;
      t.release();
    };

    await Promise.all([task(), task(), task()]);
    expect(maxRunning).toBe(1);
  });
});

describe("RateLimiter", () => {
  it("schedules functions sequentially respecting interval", async () => {
    const limiter = new RateLimiter(50); // 20ms interval
    const times: number[] = [];
    await Promise.all(
      [1, 2, 3].map(() =>
        limiter.schedule(async () => {
          times.push(Date.now());
        }),
      ),
    );
    expect(times).toHaveLength(3);
    // At least some spacing between starts
    expect(times[2]! - times[0]!).toBeGreaterThanOrEqual(15);
  });
});

describe("createWooClient", () => {
  afterEach(() => nock.cleanAll());

  it("performs rate-limited GET against WC API", async () => {
    nock(TEST_BASE)
      .get(apiPath("/products"))
      .query(true)
      .reply(200, [{ id: 1, name: "P" }], {
        "x-wp-total": "1",
        "x-wp-totalpages": "1",
      });

    const client = createWooClient(testConfig());
    const res = await client.get("products", { per_page: 1 });
    expect(res.data).toEqual([{ id: 1, name: "P" }]);
    const meta = client.pagination(res, 1, 1);
    expect(meta.total).toBe(1);
    expect(meta.totalPages).toBe(1);
    expect(meta.currentPage).toBe(1);
  });

  it("supports post/put/delete", async () => {
    nock(TEST_BASE)
      .post(apiPath("/products"))
      .query(true)
      .reply(201, { id: 9, name: "New" });
    nock(TEST_BASE)
      .put(apiPath("/products/9"))
      .query(true)
      .reply(200, { id: 9, name: "Upd" });
    nock(TEST_BASE)
      .delete(apiPath("/products/9"))
      .query(true)
      .reply(200, { id: 9, deleted: true });

    const client = createWooClient(testConfig());
    const created = await client.post("products", { name: "New" });
    expect((created.data as { id: number }).id).toBe(9);
    const updated = await client.put("products", { name: "Upd" }, { id: 9 });
    expect((updated.data as { name: string }).name).toBe("Upd");
    const deleted = await client.delete("products", { force: true }, { id: 9 });
    expect(deleted.status).toBe(200);
  });
});
