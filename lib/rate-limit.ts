type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/** Simple in-memory IP throttle with bounded memory growth. Per instance only. */
export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
): { ok: boolean; remaining: number } {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    pruneExpiredBuckets(now);
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });

    return { ok: true, remaining: limit - 1 };
  }
  if (existing.count >= limit) {
    return { ok: false, remaining: 0 };
  }
  existing.count += 1;

  return { ok: true, remaining: limit - existing.count };
}

/** Clear all buckets (for testing and manual reset). */
export function resetRateLimits(): void {
  buckets.clear();
}

/** The one statement `rateLimitShared` runs. Exported so tests can assert its shape. */
export const SHARED_BUCKET_SQL = `
INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
VALUES ($1, 1, $2)
ON CONFLICT ("key") DO UPDATE SET
  "count" = CASE WHEN "RateLimitBucket"."resetAt" <= $3 THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
  "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= $3 THEN $2 ELSE "RateLimitBucket"."resetAt" END
RETURNING "count"
`;

/** Roughly 1 in 50 calls also deletes expired rows, so the table stays small. */
const PRUNE_ONE_IN = 50;

type SharedDb = {
  $queryRawUnsafe: (sql: string, ...values: unknown[]) => Promise<unknown>;
  rateLimitBucket: {
    deleteMany: (args: {
      where: { resetAt: { lt: Date } };
    }) => Promise<unknown>;
  };
};

/**
 * Rate limit shared across every serverless instance, backed by Postgres.
 * One atomic upsert-and-increment, so concurrent instances cannot undercount.
 * Fails OPEN: if the database errors, it falls back to the per-instance limiter
 * rather than taking every route down.
 */
export async function rateLimitShared(
  key: string,
  limit = 20,
  windowMs = 60_000,
  deps: { db?: SharedDb; now?: () => number; random?: () => number } = {},
): Promise<{ ok: boolean; remaining: number }> {
  const now = (deps.now ?? Date.now)();
  const random = deps.random ?? Math.random;

  try {
    const db =
      deps.db ?? ((await import("@/lib/db")).prisma as unknown as SharedDb);
    const rows = (await db.$queryRawUnsafe(
      SHARED_BUCKET_SQL,
      key,
      new Date(now + windowMs),
      new Date(now),
    )) as { count: number | bigint }[];
    const count = Number(rows[0]?.count ?? 1);

    if (random() < 1 / PRUNE_ONE_IN) {
      void db.rateLimitBucket
        .deleteMany({ where: { resetAt: { lt: new Date(now) } } })
        .catch(() => undefined);
    }

    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (error) {
    // Fail open to the per-instance limiter, but never silently: a broken shared
    // limiter should show up in the logs, not look like "no limit".
    // eslint-disable-next-line no-console
    console.error("rateLimitShared fell back to in-memory:", error);

    return rateLimit(key, limit, windowMs);
  }
}
