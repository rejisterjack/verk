import { describe, expect, it, vi } from "vitest";

import { rateLimitShared, resetRateLimits } from "@/lib/rate-limit";

/** A tiny in-memory stand-in for the shared Postgres table. Two "instances" share it. */
function fakeSharedDb() {
  const rows = new Map<string, { count: number; resetAt: number }>();
  const deleteMany = vi.fn(async () => ({ count: 0 }));

  return {
    rows,
    deleteMany,
    db: {
      $queryRawUnsafe: vi.fn(
        async (_sql: string, key: string, newReset: Date, now: Date) => {
          const row = rows.get(key);

          if (!row || row.resetAt <= now.getTime()) {
            rows.set(key, { count: 1, resetAt: newReset.getTime() });

            return [{ count: 1 }];
          }
          row.count += 1;

          return [{ count: BigInt(row.count) }];
        },
      ),
      rateLimitBucket: { deleteMany },
    },
  };
}

const quiet = { random: () => 0.99 };

describe("rateLimitShared", () => {
  it("two instances share one counter: the 21st request in a minute is blocked", async () => {
    const { db } = fakeSharedDb();
    const instanceA = (key: string, now: number) =>
      rateLimitShared(key, 20, 60_000, { db, now: () => now, ...quiet });
    const instanceB = instanceA;
    const key = "mcp:1.2.3.4";
    let blockedAt = 0;

    for (let i = 1; i <= 21; i += 1) {
      const result = await (i % 2 ? instanceA : instanceB)(key, 1_000);

      if (!result.ok && !blockedAt) blockedAt = i;
    }

    expect(blockedAt).toBe(21);
  });

  it("reports remaining requests", async () => {
    const { db } = fakeSharedDb();
    const hit = () =>
      rateLimitShared("k", 3, 60_000, { db, now: () => 5, ...quiet });

    await expect(hit()).resolves.toEqual({ ok: true, remaining: 2 });
    await expect(hit()).resolves.toEqual({ ok: true, remaining: 1 });
    await expect(hit()).resolves.toEqual({ ok: true, remaining: 0 });
    await expect(hit()).resolves.toEqual({ ok: false, remaining: 0 });
  });

  it("starts a fresh window once the old one expires", async () => {
    const { db } = fakeSharedDb();
    const at = (now: number) =>
      rateLimitShared("k", 1, 60_000, { db, now: () => now, ...quiet });

    await expect(at(0)).resolves.toMatchObject({ ok: true });
    await expect(at(10_000)).resolves.toMatchObject({ ok: false });
    await expect(at(60_001)).resolves.toMatchObject({ ok: true });
  });

  it("keeps separate counters per key", async () => {
    const { db } = fakeSharedDb();
    const hit = (key: string) =>
      rateLimitShared(key, 1, 60_000, { db, now: () => 0, ...quiet });

    await expect(hit("a")).resolves.toMatchObject({ ok: true });
    await expect(hit("b")).resolves.toMatchObject({ ok: true });
    await expect(hit("a")).resolves.toMatchObject({ ok: false });
  });

  it("fails open to the in-memory limiter when the database errors", async () => {
    resetRateLimits();
    const db = {
      $queryRawUnsafe: vi.fn(async () => {
        throw new Error("db down");
      }),
      rateLimitBucket: { deleteMany: vi.fn() },
    };
    const key = `down-${Math.random()}`;
    const hit = () => rateLimitShared(key, 2, 60_000, { db, ...quiet });

    await expect(hit()).resolves.toMatchObject({ ok: true });
    await expect(hit()).resolves.toMatchObject({ ok: true });
    // Still throttled by the per-instance fallback, and never throws.
    await expect(hit()).resolves.toMatchObject({ ok: false });
  });

  it("occasionally prunes expired rows, and a prune failure is harmless", async () => {
    const { db, deleteMany } = fakeSharedDb();

    await rateLimitShared("k", 5, 60_000, { db, now: () => 7, random: () => 0 });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { resetAt: { lt: new Date(7) } },
    });

    deleteMany.mockRejectedValueOnce(new Error("nope"));
    await expect(
      rateLimitShared("k2", 5, 60_000, { db, now: () => 7, random: () => 0 }),
    ).resolves.toMatchObject({ ok: true });
  });
});