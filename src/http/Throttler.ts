/**
 * Throttler / Concurrency limiter.
 * Extracted from the original monolithic throttling logic inside WooCommerceRestApi.
 * Supports DI: you can pass a custom throttler (e.g. for global rate limiting across instances, or token bucket).
 * 0 or negative max = unlimited (backward compatible default).
 */

export interface Throttler {
    acquire(): Promise<void>;
    release(): void;
}

export class ConcurrencyThrottler implements Throttler {
    private current = 0;
    private readonly queue: Array<() => void> = [];
    private readonly maxConcurrent: number;

    constructor(maxConcurrent: number) {
        this.maxConcurrent = maxConcurrent;
    }

    async acquire(): Promise<void> {
        if (this.maxConcurrent <= 0) {
            return;
        }
        if (this.current < this.maxConcurrent) {
            this.current++;
            return;
        }
        return new Promise<void>((resolve) => {
            this.queue.push(() => {
                this.current++;
                resolve();
            });
        });
    }

    release(): void {
        if (this.maxConcurrent <= 0) {
            return;
        }
        this.current = Math.max(0, this.current - 1);
        const next = this.queue.shift();
        if (next) {
            next();
        }
    }
}

export function createThrottler(maxConcurrentRequests?: number): Throttler {
    return new ConcurrencyThrottler(maxConcurrentRequests ?? 0);
}
