import { describe, expect, it } from "vitest";

import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test-${Math.random()}`;

    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(false);
  });

  it("resets limits when resetRateLimits is called", () => {
    const key = `test-reset-${Math.random()}`;

    rateLimit(key, 1, 60_000);
    expect(rateLimit(key, 1, 60_000).ok).toBe(false);

    resetRateLimits();
    expect(rateLimit(key, 1, 60_000).ok).toBe(true);
  });

  it("resets bucket after window expires", () => {
    const key = `test-window-${Math.random()}`;

    expect(rateLimit(key, 1, -1).ok).toBe(true); // already expired
    expect(rateLimit(key, 1, -1).ok).toBe(true);
  });
});
