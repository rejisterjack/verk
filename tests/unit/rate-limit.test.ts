import { describe, expect, it } from "vitest";

import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(false);
  });
});
