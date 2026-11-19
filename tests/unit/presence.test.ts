import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  issuePresence: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { beatPresence, listPresence, STALE_MS } from "@/lib/services/presence";

beforeEach(() => {
  vi.clearAllMocks();
  db.issuePresence.upsert.mockResolvedValue({});
  db.issuePresence.deleteMany.mockResolvedValue({ count: 0 });
});

describe("beatPresence", () => {
  it("upserts the heartbeat and deletes rows older than ten minutes", async () => {
    const before = Date.now();

    await beatPresence("i1", "u1");

    expect(db.issuePresence.upsert).toHaveBeenCalledWith({
      where: { issueId_userId: { issueId: "i1", userId: "u1" } },
      create: { issueId: "i1", userId: "u1" },
      update: { seenAt: expect.any(Date) },
    });
    const cutoff = (
      db.issuePresence.deleteMany.mock.calls[0]![0] as {
        where: { seenAt: { lt: Date } };
      }
    ).where.seenAt.lt.getTime();

    expect(cutoff).toBeGreaterThanOrEqual(before - STALE_MS);
    expect(cutoff).toBeLessThanOrEqual(Date.now() - STALE_MS + 5);
  });

  it("never fails the heartbeat when cleanup errors", async () => {
    db.issuePresence.deleteMany.mockRejectedValue(new Error("db down"));

    await expect(beatPresence("i1", "u1")).resolves.toBeUndefined();
  });
});

describe("listPresence", () => {
  it("shows only fresh rows from other users, using the 60s window", async () => {
    db.issuePresence.findMany.mockResolvedValue([
      { user: { id: "u2", name: null, email: "b@x.dev" } },
      { user: { id: "u3", name: "Cy", email: "c@x.dev" } },
    ]);

    await expect(listPresence("i1", "u1")).resolves.toEqual([
      { id: "u2", name: "b@x.dev" },
      { id: "u3", name: "Cy" },
    ]);
    const where = (
      db.issuePresence.findMany.mock.calls[0]![0] as {
        where: { seenAt: { gte: Date }; NOT: { userId: string } };
      }
    ).where;

    expect(where.NOT).toEqual({ userId: "u1" });
    expect(Date.now() - where.seenAt.gte.getTime()).toBeLessThan(61_000);
  });
});