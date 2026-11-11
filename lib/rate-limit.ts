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

/** Simple in-memory IP throttle with bounded memory growth. */
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
