import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  forwardEdge,
  inverseRelation,
  wouldCreateCycle,
} from "@/lib/relation-pairs";
import {
  rankSimilar,
  titleSimilarity,
  tokenize,
} from "@/lib/similar-issues";

describe("relation pairs", () => {
  it("pairs duplicate relations both ways", () => {
    expect(inverseRelation("DUPLICATE")).toBe("DUPLICATED_BY");
    expect(inverseRelation("DUPLICATED_BY")).toBe("DUPLICATE");
    expect(inverseRelation("RELATED")).toBeNull();
  });

  it("normalises blocking and parent edges to one direction", () => {
    expect(forwardEdge("BLOCKS", "a", "b")).toEqual({
      kind: "BLOCKS",
      edge: { from: "a", to: "b" },
    });
    expect(forwardEdge("BLOCKED_BY", "a", "b")).toEqual({
      kind: "BLOCKS",
      edge: { from: "b", to: "a" },
    });
    expect(forwardEdge("CHILD", "p", "c")).toEqual({
      kind: "PARENT",
      edge: { from: "p", to: "c" },
    });
    expect(forwardEdge("PARENT", "c", "p")).toEqual({
      kind: "PARENT",
      edge: { from: "p", to: "c" },
    });
    expect(forwardEdge("RELATED", "a", "b")).toBeNull();
    expect(forwardEdge("DUPLICATE", "a", "b")).toBeNull();
  });
});

describe("wouldCreateCycle", () => {
  const edges = [
    { from: "a", to: "b" },
    { from: "b", to: "c" },
  ];

  it("rejects an issue that relates to itself", () => {
    expect(wouldCreateCycle([], "a", "a")).toBe(true);
  });

  it("allows a new edge that does not close a loop", () => {
    expect(wouldCreateCycle(edges, "a", "c")).toBe(false);
    expect(wouldCreateCycle(edges, "c", "d")).toBe(false);
  });

  it("rejects a direct back edge", () => {
    expect(wouldCreateCycle(edges, "b", "a")).toBe(true);
  });

  it("rejects an indirect loop", () => {
    expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
  });

  it("terminates on a graph that already contains a loop", () => {
    const looped = [
      { from: "x", to: "y" },
      { from: "y", to: "x" },
    ];

    expect(wouldCreateCycle(looped, "p", "x")).toBe(false);
  });
});

describe("similar issues", () => {
  it("ignores case, punctuation and filler words", () => {
    expect(tokenize("Fix: the Login bug!!")).toEqual(["login"]);
    expect(tokenize("")).toEqual([]);
  });

  it("scores identical titles 1 and unrelated titles 0", () => {
    expect(titleSimilarity("Login fails on Safari", "login fails on safari")).toBe(1);
    expect(titleSimilarity("Login fails on Safari", "Export invoices to PDF")).toBe(0);
    expect(titleSimilarity("", "anything here")).toBe(0);
  });

  it("scores partial overlap between 0 and 1", () => {
    const score = titleSimilarity(
      "Login button broken on Safari",
      "Safari login button not working",
    );

    expect(score).toBeGreaterThan(0.34);
    expect(score).toBeLessThan(1);
  });

  it("ranks the closest match first and drops weak ones", () => {
    const ranked = rankSimilar(
      "Checkout page crashes on submit",
      [
        { id: "1", title: "Update footer links" },
        { id: "2", title: "Checkout page crashes when submitting order" },
        { id: "3", title: "Checkout crashes on submit button" },
      ],
    );

    expect(ranked.map((row) => row.id)).toEqual(["3", "2"]);
  });

  it("respects the limit", () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      title: "Checkout page crashes on submit",
    }));

    expect(rankSimilar("Checkout page crashes on submit", candidates, 3)).toHaveLength(3);
  });
});

const db = vi.hoisted(() => ({
  issue: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  issueRelation: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  issueSubscription: { findMany: vi.fn(), createMany: vi.fn() },
  workflowStatus: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/services/surface", () => ({ recordActivity: vi.fn() }));
const setParent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/sub-issues", () => ({ setParent }));

import { addRelation, findSimilarIssues } from "@/lib/services/relations";

const id = (n: number) => `c${String(n).padStart(24, "0")}`;

describe("addRelation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.issue.findFirst.mockImplementation(
      async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        teamId: "t1",
        status: "TODO",
      }),
    );
    db.issueRelation.findMany.mockResolvedValue([]);
    db.issueRelation.findFirst.mockResolvedValue(null);
    db.issueRelation.create.mockResolvedValue({ id: "rel1" });
    db.issueSubscription.findMany.mockResolvedValue([]);
    db.workflowStatus.findFirst.mockResolvedValue(null);
    db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) =>
      fn(db),
    );
  });

  it("rejects relating an issue to itself", async () => {
    await expect(
      addRelation("t1", id(1), { toIssueId: id(1), type: "RELATED" }),
    ).rejects.toThrow(/itself/);
  });

  it("rejects a blocking loop", async () => {
    // 2 already blocks 1; making 1 block 2 would loop
    db.issueRelation.findMany.mockResolvedValue([
      { fromIssueId: id(2), toIssueId: id(1) },
    ]);
    await expect(
      addRelation("t1", id(1), { toIssueId: id(2), type: "BLOCKS" }),
    ).rejects.toThrow(/loop/);
  });

  it("stores CHILD on the issue (parentId), not as a relation row", async () => {
    await addRelation("t1", id(3), { toIssueId: id(4), type: "CHILD" }, "u1");
    // CHILD: from is the parent, to is the child
    expect(setParent).toHaveBeenCalledWith("t1", id(4), id(3), "MEMBER", "u1");
    expect(db.issueRelation.create).not.toHaveBeenCalled();
  });

  it("stores PARENT the other way round", async () => {
    await addRelation("t1", id(3), { toIssueId: id(4), type: "PARENT" }, "u1");
    expect(setParent).toHaveBeenCalledWith("t1", id(3), id(4), "MEMBER", "u1");
  });

  it("passes parent errors (loops, depth) straight through", async () => {
    setParent.mockRejectedValueOnce(new Error("That would make an issue its own ancestor"));
    await expect(
      addRelation("t1", id(3), { toIssueId: id(4), type: "CHILD" }),
    ).rejects.toThrow(/own ancestor/);
  });

  it("creates both sides of a blocking relation", async () => {
    await addRelation("t1", id(1), { toIssueId: id(2), type: "BLOCKS" });
    expect(db.issueRelation.create).toHaveBeenCalledTimes(1);
    expect(db.issueRelation.upsert).toHaveBeenCalledTimes(1);
    expect(db.issueRelation.upsert.mock.calls[0]![0].create.type).toBe(
      "BLOCKED_BY",
    );
  });

  it("is idempotent when the relation already exists", async () => {
    // RELATED skips the parent check, so the only lookup is the "already there?" one.
    db.issueRelation.findFirst.mockResolvedValueOnce({ id: "exists" });
    const result = await addRelation("t1", id(1), {
      toIssueId: id(2),
      type: "RELATED",
    });

    expect(result).toEqual({ id: "exists" });
    expect(db.issueRelation.create).not.toHaveBeenCalled();
  });

  it("cancels the duplicate and moves its watchers to the canonical issue", async () => {
    db.issueSubscription.findMany.mockResolvedValue([{ userId: "u1" }]);
    db.workflowStatus.findFirst.mockResolvedValue({ id: "ws-cancelled" });
    await addRelation(
      "t1",
      id(1),
      { toIssueId: id(2), type: "DUPLICATE" },
      "actor",
    );

    expect(db.issueSubscription.createMany.mock.calls[0]![0].data).toEqual([
      { issueId: id(2), userId: "u1" },
    ]);
    const update = db.issue.update.mock.calls[0]![0];

    expect(update.where.id).toBe(id(1));
    expect(update.data.status).toBe("CANCELLED");
    expect(update.data.workflowStatusId).toBe("ws-cancelled");
  });

  it("cancels the right side for DUPLICATED_BY", async () => {
    await addRelation("t1", id(1), { toIssueId: id(2), type: "DUPLICATED_BY" });
    expect(db.issue.update.mock.calls[0]![0].where.id).toBe(id(2));
  });
});

describe("findSimilarIssues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.issue.findMany.mockResolvedValue([
      { id: "1", number: 1, title: "Checkout page crashes on submit", status: "TODO" },
      { id: "2", number: 2, title: "Update footer links", status: "TODO" },
    ]);
  });

  it("skips short titles without querying", async () => {
    expect(await findSimilarIssues("t1", "ab")).toEqual([]);
    expect(db.issue.findMany).not.toHaveBeenCalled();
  });

  it("returns matches and never looks at archived issues", async () => {
    const result = await findSimilarIssues("t1", "Checkout crashes on submit");

    expect(result.map((row) => row.id)).toEqual(["1"]);
    expect(db.issue.findMany.mock.calls[0]![0].where.archivedAt).toBeNull();
  });

  it("excludes the issue itself", async () => {
    await findSimilarIssues("t1", "Checkout crashes on submit", {
      excludeId: "1",
    });
    expect(db.issue.findMany.mock.calls[0]![0].where.id).toEqual({ not: "1" });
  });
});