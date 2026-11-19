import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  issue: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  issueDeletion: { createMany: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
  issueLabel: { createMany: vi.fn(), deleteMany: vi.fn() },
  label: { count: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/services/surface", () => ({ recordActivity: vi.fn() }));
vi.mock("@/lib/services/webhooks", () => ({
  dispatchWebhooks: vi.fn(),
  WEBHOOK_EVENTS: [],
}));

import {
  ARCHIVE_RETENTION_DAYS,
  archiveIssue,
  bulkUpdateIssues,
  listIssues,
  purgeArchivedIssues,
  restoreIssue,
  syncIssues,
} from "@/lib/services/issues";

const id = (n: number) => `c${String(n).padStart(24, "0")}`;
const issue = (n: number, extra: Record<string, unknown> = {}) => ({
  id: id(n),
  teamId: "t1",
  creatorId: "u1",
  archivedAt: null,
  revision: 0,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.issue.findMany.mockResolvedValue([]);
  db.issue.update.mockResolvedValue({});
  db.$transaction.mockResolvedValue([]);
});

describe("listIssues archive filter", () => {
  it("hides archived issues by default", async () => {
    await listIssues("t1", {});
    expect(db.issue.findMany.mock.calls[0]![0].where.archivedAt).toBeNull();
  });

  it("lists only archived issues when asked", async () => {
    await listIssues("t1", { archived: "true" });
    expect(db.issue.findMany.mock.calls[0]![0].where.archivedAt).toEqual({
      not: null,
    });
  });
});

describe("syncIssues", () => {
  it("reports archived issues as removed so the offline cache drops them", async () => {
    db.issue.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "gone" }]);
    db.issueDeletion.findMany.mockResolvedValue([{ issueId: "deleted" }]);
    const result = await syncIssues("t1", new Date(0).toISOString());

    expect(result.deletedIds).toEqual(["deleted", "gone"]);
  });
});

describe("archiveIssue / restoreIssue", () => {
  it("archives and records who did it", async () => {
    db.issue.findFirst
      .mockResolvedValueOnce(issue(1))
      .mockResolvedValueOnce(issue(1, { archivedAt: new Date() }));
    await archiveIssue("t1", id(1), "MEMBER", "u2");
    const data = db.issue.update.mock.calls[0]![0].data;

    expect(data.archivedAt).toBeInstanceOf(Date);
    expect(data.archivedById).toBe("u2");
    expect(data.revision).toEqual({ increment: 1 });
  });

  it("is a no-op for an issue that is already archived", async () => {
    db.issue.findFirst.mockResolvedValue(issue(1, { archivedAt: new Date() }));
    await archiveIssue("t1", id(1), "MEMBER", "u2");
    expect(db.issue.update).not.toHaveBeenCalled();
  });

  it("refuses guests", async () => {
    await expect(archiveIssue("t1", id(1), "GUEST", "u2")).rejects.toThrow(
      /permissions/i,
    );
  });

  it("404s on an issue from another team", async () => {
    db.issue.findFirst.mockResolvedValue(null);
    await expect(archiveIssue("t1", id(1), "MEMBER", "u2")).rejects.toThrow(
      /not found/i,
    );
  });

  it("restores by clearing the archive fields", async () => {
    db.issue.findFirst.mockResolvedValue(issue(1, { archivedAt: new Date() }));
    await restoreIssue("t1", id(1), "MEMBER", "u2");
    const data = db.issue.update.mock.calls[0]![0].data;

    expect(data.archivedAt).toBeNull();
    expect(data.archivedById).toBeNull();
  });
});

describe("purgeArchivedIssues", () => {
  it("deletes only issues archived longer than the retention window", async () => {
    const now = new Date("2026-12-01T00:00:00Z");

    db.issue.findMany.mockResolvedValue([{ id: "a", teamId: "t1" }]);
    const purged = await purgeArchivedIssues(now);
    const cutoff = db.issue.findMany.mock.calls[0]![0].where.archivedAt.lt;

    expect(purged).toBe(1);
    expect(now.getTime() - cutoff.getTime()).toBe(
      ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    // tombstones keep offline clients in sync
    expect(db.issueDeletion.createMany).toHaveBeenCalled();
  });

  it("does nothing when nothing is old enough", async () => {
    expect(await purgeArchivedIssues()).toBe(0);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("bulkUpdateIssues", () => {
  it("rejects an empty selection and more than 200 ids", async () => {
    await expect(
      bulkUpdateIssues("t1", { ids: [], action: "archive" }, "MEMBER", "u1"),
    ).rejects.toThrow();
    await expect(
      bulkUpdateIssues(
        "t1",
        { ids: Array.from({ length: 201 }, (_, i) => id(i)), action: "archive" },
        "MEMBER",
        "u1",
      ),
    ).rejects.toThrow();
  });

  it("rejects unknown patch fields instead of ignoring them", async () => {
    await expect(
      bulkUpdateIssues(
        "t1",
        { ids: [id(1)], patch: { teamId: "other" } },
        "MEMBER",
        "u1",
      ),
    ).rejects.toThrow();
  });

  it("requires a patch for an update", async () => {
    await expect(
      bulkUpdateIssues("t1", { ids: [id(1)], action: "update" }, "MEMBER", "u1"),
    ).rejects.toThrow(/patch is required/);
  });

  it("refuses guests", async () => {
    await expect(
      bulkUpdateIssues("t1", { ids: [id(1)], action: "archive" }, "GUEST", "u1"),
    ).rejects.toThrow(/permissions/i);
  });

  it("archives many and reports ids that are not in the team as failed", async () => {
    db.issue.findMany.mockResolvedValue([issue(1), issue(2)]);
    db.issue.findFirst.mockImplementation(
      async ({ where }: { where: { id: string } }) =>
        where.id === id(1) || where.id === id(2) ? issue(Number(where.id.slice(-1))) : null,
    );
    const result = await bulkUpdateIssues(
      "t1",
      { ids: [id(1), id(2), id(9)], action: "archive" },
      "MEMBER",
      "u1",
    );

    expect(result.ok.sort()).toEqual([id(1), id(2)]);
    expect(result.failed).toEqual([{ id: id(9), error: "Issue not found" }]);
  });

  it("de-duplicates ids", async () => {
    db.issue.findMany.mockResolvedValue([issue(1)]);
    db.issue.findFirst.mockResolvedValue(issue(1));
    const result = await bulkUpdateIssues(
      "t1",
      { ids: [id(1), id(1), id(1)], action: "archive" },
      "MEMBER",
      "u1",
    );

    expect(result.ok).toEqual([id(1)]);
  });

  it("only lets admins or the creator bulk-delete", async () => {
    db.issue.findMany.mockResolvedValue([issue(1, { creatorId: "someone" })]);
    const result = await bulkUpdateIssues(
      "t1",
      { ids: [id(1)], action: "delete" },
      "MEMBER",
      "u1",
    );

    expect(result.ok).toEqual([]);
    expect(result.failed[0]!.error).toMatch(/admins or the creator/);
  });

  it("rejects labels that belong to another team", async () => {
    db.issue.findMany.mockResolvedValue([issue(1)]);
    db.label.count.mockResolvedValue(0);
    await expect(
      bulkUpdateIssues(
        "t1",
        { ids: [id(1)], patch: { addLabelIds: [id(5)] } },
        "MEMBER",
        "u1",
      ),
    ).rejects.toThrow(/Unknown label/);
  });

  it("adds and removes labels", async () => {
    db.issue.findMany.mockResolvedValue([issue(1)]);
    db.label.count.mockResolvedValue(2);
    const result = await bulkUpdateIssues(
      "t1",
      { ids: [id(1)], patch: { addLabelIds: [id(5)], removeLabelIds: [id(6)] } },
      "MEMBER",
      "u1",
    );

    expect(result.ok).toEqual([id(1)]);
    expect(db.issueLabel.createMany).toHaveBeenCalled();
    expect(db.issueLabel.deleteMany).toHaveBeenCalled();
  });
});