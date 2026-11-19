import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkParentChain,
  MAX_SUBISSUE_DEPTH,
  subIssueProgress,
} from "@/lib/sub-issues";

describe("checkParentChain", () => {
  it("allows a parent that is not a descendant", () => {
    expect(checkParentChain(["p", "gp"], "child")).toBeNull();
  });

  it("allows a brand new issue (no id yet)", () => {
    expect(checkParentChain(["p"], null)).toBeNull();
  });

  it("rejects making an issue its own ancestor", () => {
    expect(checkParentChain(["p", "gp", "me"], "me")).toMatch(/own ancestor/);
  });

  it("rejects nesting deeper than the limit", () => {
    const deep = Array.from({ length: MAX_SUBISSUE_DEPTH }, (_, i) => `a${i}`);

    expect(checkParentChain(deep, "x")).toMatch(/levels/);
    expect(checkParentChain(deep.slice(1), "x")).toBeNull();
  });
});

describe("subIssueProgress", () => {
  it("is empty with no children", () => {
    expect(subIssueProgress([])).toEqual({ total: 0, done: 0, percent: 0 });
  });

  it("counts done and cancelled as finished", () => {
    expect(
      subIssueProgress([
        { status: "DONE" },
        { status: "CANCELLED" },
        { status: "TODO" },
        { status: "IN_PROGRESS" },
      ]),
    ).toEqual({ total: 4, done: 2, percent: 50 });
  });

  it("rounds the percentage", () => {
    expect(
      subIssueProgress([{ status: "DONE" }, { status: "TODO" }, { status: "TODO" }])
        .percent,
    ).toBe(33);
  });
});

const db = vi.hoisted(() => ({
  issue: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  team: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/services/surface", () => ({ recordActivity: vi.fn() }));
vi.mock("@/lib/services/webhooks", () => ({
  dispatchWebhooks: vi.fn(),
  WEBHOOK_EVENTS: [],
}));
const updateIssue = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/issues", () => ({ updateIssue, createIssue: vi.fn() }));

import {
  assertValidParent,
  completeParentIfDone,
  listSubIssues,
  loadAncestors,
  setParent,
} from "@/lib/services/sub-issues";

/** An in-memory issue table: id -> parentId. */
function tree(parents: Record<string, string | null>) {
  db.issue.findFirst.mockImplementation(
    async ({ where }: { where: { id: string; archivedAt?: null } }) => {
      if (!(where.id in parents)) return null;

      return {
        id: where.id,
        number: Number(where.id.replace(/\D/g, "")) || 1,
        parentId: parents[where.id],
        projectId: null,
        cycleId: null,
      };
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  db.issue.findMany.mockResolvedValue([]);
  db.issue.update.mockResolvedValue({});
});

describe("loadAncestors", () => {
  it("returns the parent chain nearest first", async () => {
    tree({ c: "b", b: "a", a: null });
    expect(await loadAncestors("t1", "c")).toEqual(["c", "b", "a"]);
  });

  it("stops on a corrupt loop instead of hanging", async () => {
    tree({ a: "b", b: "a" });
    const chain = await loadAncestors("t1", "a");

    expect(chain).toEqual(["a", "b"]);
  });
});

describe("assertValidParent", () => {
  it("rejects a parent from another team or an archived one", async () => {
    tree({});
    await expect(assertValidParent("t1", "x", "missing")).rejects.toThrow(
      /not found/i,
    );
  });

  it("rejects an issue as its own parent", async () => {
    tree({ a: null });
    await expect(assertValidParent("t1", "a", "a")).rejects.toThrow(
      /own parent/,
    );
  });

  it("rejects a parent that sits under the issue", async () => {
    // a -> b -> c : making c the parent of a would loop
    tree({ a: null, b: "a", c: "b" });
    await expect(assertValidParent("t1", "a", "c")).rejects.toThrow(
      /own ancestor/,
    );
  });

  it("accepts a valid parent", async () => {
    tree({ a: null, b: null });
    await expect(assertValidParent("t1", "a", "b")).resolves.toMatchObject({
      id: "b",
    });
  });
});

describe("setParent", () => {
  it("refuses guests", async () => {
    await expect(setParent("t1", "a", "b", "GUEST", "u1")).rejects.toThrow(
      /permissions/i,
    );
  });

  it("sets the parent and bumps the revision", async () => {
    tree({ a: null, b: null });
    await setParent("t1", "a", "b", "MEMBER", "u1");
    const data = db.issue.update.mock.calls[0]![0].data;

    expect(data.parentId).toBe("b");
    expect(data.revision).toEqual({ increment: 1 });
  });

  it("is a no-op when the parent is unchanged", async () => {
    tree({ a: "b", b: null });
    await setParent("t1", "a", "b", "MEMBER", "u1");
    expect(db.issue.update).not.toHaveBeenCalled();
  });

  it("clears the parent with null", async () => {
    tree({ a: "b", b: null });
    await setParent("t1", "a", null, "MEMBER", "u1");
    expect(db.issue.update.mock.calls[0]![0].data.parentId).toBeNull();
  });

  it("404s on an unknown issue", async () => {
    tree({});
    await expect(setParent("t1", "zzz", null, "MEMBER", "u1")).rejects.toThrow(
      /not found/i,
    );
  });
});

describe("listSubIssues", () => {
  it("returns the parent, children and progress", async () => {
    db.issue.findFirst.mockResolvedValue({
      id: "p",
      parent: { id: "gp", number: 1, title: "Grand", status: "TODO" },
    });
    db.issue.findMany.mockResolvedValue([
      { id: "c1", number: 2, title: "a", status: "DONE", priority: "NONE" },
      { id: "c2", number: 3, title: "b", status: "TODO", priority: "NONE" },
    ]);
    const result = await listSubIssues("t1", "p");

    expect(result.parent?.id).toBe("gp");
    expect(result.children).toHaveLength(2);
    expect(result.progress).toEqual({ total: 2, done: 1, percent: 50 });
    expect(db.issue.findMany.mock.calls[0]![0].where.archivedAt).toBeNull();
  });
});

describe("completeParentIfDone", () => {
  function setup(opts: {
    auto: boolean;
    parentStatus?: string;
    children: { status: string }[];
  }) {
    db.team.findUnique.mockResolvedValue({ autoCloseParent: opts.auto });
    db.issue.findFirst.mockResolvedValue({
      id: "p",
      status: opts.parentStatus ?? "IN_PROGRESS",
      parentId: null,
    });
    db.issue.findMany.mockResolvedValue(opts.children);
  }

  it("finishes the parent when every sub-issue is done", async () => {
    setup({ auto: true, children: [{ status: "DONE" }, { status: "DONE" }] });
    await completeParentIfDone("t1", "p", "u1");
    expect(updateIssue).toHaveBeenCalledWith(
      "t1",
      "p",
      { status: "DONE" },
      "MEMBER",
      "u1",
    );
  });

  it("does nothing when the team setting is off", async () => {
    setup({ auto: false, children: [{ status: "DONE" }] });
    await completeParentIfDone("t1", "p", "u1");
    expect(updateIssue).not.toHaveBeenCalled();
  });

  it("waits while a sub-issue is still open", async () => {
    setup({ auto: true, children: [{ status: "DONE" }, { status: "TODO" }] });
    await completeParentIfDone("t1", "p", "u1");
    expect(updateIssue).not.toHaveBeenCalled();
  });

  it("does not finish a parent whose sub-issues were all cancelled", async () => {
    setup({
      auto: true,
      children: [{ status: "CANCELLED" }, { status: "CANCELLED" }],
    });
    await completeParentIfDone("t1", "p", "u1");
    expect(updateIssue).not.toHaveBeenCalled();
  });

  it("leaves a parent that is already finished alone", async () => {
    setup({ auto: true, parentStatus: "DONE", children: [{ status: "DONE" }] });
    await completeParentIfDone("t1", "p", "u1");
    expect(updateIssue).not.toHaveBeenCalled();
  });

  it("does nothing for an issue without a parent", async () => {
    await completeParentIfDone("t1", null, "u1");
    expect(updateIssue).not.toHaveBeenCalled();
  });
});