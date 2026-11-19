import { describe, expect, it } from "vitest";

import {
  LEASE_MINUTES,
  MAX_CLAIMS_PER_AGENT,
  MAX_LEASE_MINUTES,
  MAX_NOTE,
  canAct,
  cleanNote,
  decideClaim,
  effectiveState,
  leaseEnd,
  type ClaimRow,
} from "@/lib/agent-claims";

const NOW = new Date("2026-01-01T12:00:00Z");
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

function claim(overrides: Partial<ClaimRow> = {}): ClaimRow {
  return {
    agentUserId: "agent-a",
    state: "active",
    leaseExpiresAt: minutes(10),
    ...overrides,
  };
}

describe("effectiveState", () => {
  it("keeps a live lease active", () => {
    expect(effectiveState(claim(), NOW)).toBe("active");
  });

  it("turns an active claim past its lease into expired", () => {
    expect(effectiveState(claim({ leaseExpiresAt: minutes(-1) }), NOW)).toBe(
      "expired",
    );
    expect(effectiveState(claim({ leaseExpiresAt: NOW }), NOW)).toBe("expired");
  });

  it("passes finished states through and treats unknown text as released", () => {
    expect(effectiveState(claim({ state: "completed" }), NOW)).toBe(
      "completed",
    );
    expect(effectiveState(claim({ state: "failed" }), NOW)).toBe("failed");
    expect(effectiveState(claim({ state: "weird" }), NOW)).toBe("released");
  });
});

describe("leaseEnd", () => {
  it("defaults to 30 minutes", () => {
    expect(leaseEnd(undefined, NOW)).toEqual(minutes(LEASE_MINUTES));
    expect(leaseEnd(0, NOW)).toEqual(minutes(LEASE_MINUTES));
    expect(leaseEnd(-5, NOW)).toEqual(minutes(LEASE_MINUTES));
    expect(leaseEnd(Number.NaN, NOW)).toEqual(minutes(LEASE_MINUTES));
  });

  it("honours a request up to four hours and no more", () => {
    expect(leaseEnd(60, NOW)).toEqual(minutes(60));
    expect(leaseEnd(10_000, NOW)).toEqual(minutes(MAX_LEASE_MINUTES));
  });
});

describe("decideClaim", () => {
  it("lets an agent take a free issue", () => {
    expect(decideClaim(null, "agent-a", 0, NOW)).toEqual({
      ok: true,
      takeOver: false,
    });
  });

  it("refuses an issue another agent holds a live lease on", () => {
    expect(decideClaim(claim(), "agent-b", 0, NOW)).toEqual({
      ok: false,
      reason: "held",
    });
  });

  it("lets the holder renew without counting against its limit", () => {
    expect(
      decideClaim(claim(), "agent-a", MAX_CLAIMS_PER_AGENT, NOW),
    ).toEqual({ ok: true, takeOver: false });
  });

  it("lets another agent take over an expired or finished claim", () => {
    expect(
      decideClaim(claim({ leaseExpiresAt: minutes(-1) }), "agent-b", 0, NOW),
    ).toEqual({ ok: true, takeOver: true });
    expect(
      decideClaim(claim({ state: "completed" }), "agent-b", 0, NOW),
    ).toEqual({ ok: true, takeOver: true });
  });

  it("stops an agent already at its maximum", () => {
    expect(decideClaim(null, "agent-a", MAX_CLAIMS_PER_AGENT, NOW)).toEqual({
      ok: false,
      reason: "limit",
    });
    expect(decideClaim(null, "agent-a", MAX_CLAIMS_PER_AGENT - 1, NOW)).toEqual(
      { ok: true, takeOver: false },
    );
  });
});

describe("canAct", () => {
  it("allows only the holder of a live lease", () => {
    expect(canAct(claim(), "agent-a", NOW)).toBe(true);
    expect(canAct(claim(), "agent-b", NOW)).toBe(false);
    expect(canAct(null, "agent-a", NOW)).toBe(false);
  });

  it("refuses the holder once the lease ran out or the claim ended", () => {
    expect(canAct(claim({ leaseExpiresAt: minutes(-1) }), "agent-a", NOW)).toBe(
      false,
    );
    expect(canAct(claim({ state: "released" }), "agent-a", NOW)).toBe(false);
  });
});

describe("cleanNote", () => {
  it("trims, strips control characters and caps the length", () => {
    expect(cleanNote("  hello\u0000 world  ")).toBe("hello world");
    expect(cleanNote("a".repeat(MAX_NOTE + 50))).toHaveLength(MAX_NOTE);
  });

  it("keeps newlines and tabs and returns an empty string for non-text", () => {
    expect(cleanNote("a\nb\tc")).toBe("a\nb\tc");
    expect(cleanNote(42)).toBe("");
    expect(cleanNote(undefined)).toBe("");
  });
});