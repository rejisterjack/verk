import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  pipeline: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    aggregate: vi.fn(),
  },
  pipelineStage: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  release: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  issue: { findFirst: vi.fn() },
  issueRelease: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import {
  addPipelineStage,
  createRelease,
  deletePipelineStage,
  reorderIds,
  setIssueRelease,
  updateRelease,
} from "@/lib/services/releases";

const stage = (id: string, pipelineId: string, position = 0) => ({
  id,
  teamId: "t1",
  pipelineId,
  name: id,
  position,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : (ops as () => unknown)(),
  );
});

describe("reorderIds", () => {
  it("swaps neighbours and stops at the edges", () => {
    expect(reorderIds(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(reorderIds(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
    expect(reorderIds(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
    expect(reorderIds(["a", "b", "c"], "c", "down")).toEqual(["a", "b", "c"]);
    expect(reorderIds(["a", "b"], "zzz", "up")).toEqual(["a", "b"]);
  });
});

describe("createRelease", () => {
  const pipelines = [
    { id: "pA", teamId: "t1", stages: [stage("a1", "pA"), stage("a2", "pA", 1)] },
    { id: "pB", teamId: "t1", stages: [stage("b1", "pB"), stage("b2", "pB", 1)] },
  ];

  beforeEach(() => {
    db.pipeline.findMany.mockResolvedValue(pipelines);
    db.release.create.mockImplementation(async ({ data }) => data);
  });

  it("defaults to the first pipeline and its first stage", async () => {
    const release = await createRelease("t1", { name: "v1" });

    expect(release).toMatchObject({ pipelineId: "pA", stageId: "a1" });
  });

  it("uses the chosen pipeline's first stage", async () => {
    const release = await createRelease("t1", { name: "v2", pipelineId: "pB" });

    expect(release).toMatchObject({ pipelineId: "pB", stageId: "b1" });
  });

  it("rejects a stage from another pipeline", async () => {
    await expect(
      createRelease("t1", { name: "v3", pipelineId: "pB", stageId: "a1" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an unknown pipeline", async () => {
    await expect(
      createRelease("t1", { name: "v4", pipelineId: "nope" }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("updateRelease", () => {
  it("rejects a stage outside the release's pipeline", async () => {
    db.release.findFirst.mockResolvedValue({ id: "r1", pipelineId: "pA" });
    db.pipelineStage.findFirst.mockResolvedValue(null);

    await expect(
      updateRelease("t1", "r1", { stageId: "b1" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.pipelineStage.findFirst).toHaveBeenCalledWith({
      where: { id: "b1", teamId: "t1", pipelineId: "pA" },
    });
  });

  it("accepts a stage inside the pipeline", async () => {
    db.release.findFirst.mockResolvedValue({ id: "r1", pipelineId: "pA" });
    db.pipelineStage.findFirst.mockResolvedValue(stage("a2", "pA", 1));
    db.release.update.mockResolvedValue({ id: "r1", stageId: "a2" });

    await updateRelease("t1", "r1", { stageId: "a2" });
    expect(db.release.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { stageId: "a2" },
    });
  });
});

describe("setIssueRelease", () => {
  beforeEach(() => {
    db.issue.findFirst.mockResolvedValue({ id: "i1" });
    db.release.findFirst.mockResolvedValue({ id: "r1", pipelineId: "pA" });
    db.pipelineStage.findMany.mockResolvedValue([
      stage("a1", "pA"),
      stage("a2", "pA", 1),
    ]);
  });

  it("defaults to the release pipeline's first stage", async () => {
    await expect(setIssueRelease("t1", "i1", "r1")).resolves.toEqual({
      releaseId: "r1",
      stageId: "a1",
    });
  });

  it("moves an issue to another stage of the same pipeline", async () => {
    await expect(setIssueRelease("t1", "i1", "r1", "a2")).resolves.toEqual({
      releaseId: "r1",
      stageId: "a2",
    });
  });

  it("rejects a stage from a different pipeline", async () => {
    await expect(
      setIssueRelease("t1", "i1", "r1", "b1"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("clears the release", async () => {
    await expect(setIssueRelease("t1", "i1", null)).resolves.toBeNull();
    expect(db.issueRelease.deleteMany).toHaveBeenCalledWith({
      where: { issueId: "i1" },
    });
  });
});

describe("pipeline stages", () => {
  it("refuses to delete the last stage", async () => {
    db.pipelineStage.findFirst.mockResolvedValue(stage("a1", "pA"));
    db.pipelineStage.findMany.mockResolvedValue([stage("a1", "pA")]);

    await expect(deletePipelineStage("t1", "a1")).rejects.toMatchObject({
      status: 400,
    });
    expect(db.pipelineStage.delete).not.toHaveBeenCalled();
  });

  it("moves issues and releases to the first remaining stage on delete", async () => {
    db.pipelineStage.findFirst.mockResolvedValue(stage("a1", "pA"));
    db.pipelineStage.findMany.mockResolvedValue([
      stage("a1", "pA"),
      stage("a2", "pA", 1),
      stage("a3", "pA", 2),
    ]);

    await expect(deletePipelineStage("t1", "a1")).resolves.toEqual({
      movedTo: "a2",
    });
    expect(db.issueRelease.updateMany).toHaveBeenCalledWith({
      where: { stageId: "a1" },
      data: { stageId: "a2" },
    });
    expect(db.release.updateMany).toHaveBeenCalledWith({
      where: { stageId: "a1" },
      data: { stageId: "a2" },
    });
    expect(db.pipelineStage.delete).toHaveBeenCalledWith({
      where: { id: "a1" },
    });
  });

  it("allows the same stage name in two pipelines but not twice in one", async () => {
    db.pipeline.findFirst.mockResolvedValue({ id: "pB", teamId: "t1" });
    db.pipelineStage.aggregate.mockResolvedValue({ _max: { position: 2 } });
    db.pipelineStage.create.mockImplementation(async ({ data }) => data);

    db.pipelineStage.findFirst.mockResolvedValueOnce(null);
    await expect(addPipelineStage("t1", "pB", "QA")).resolves.toMatchObject({
      pipelineId: "pB",
      name: "QA",
      position: 3,
    });

    db.pipelineStage.findFirst.mockResolvedValueOnce(stage("QA", "pB"));
    await expect(addPipelineStage("t1", "pB", "QA")).rejects.toMatchObject({
      status: 409,
    });
    expect(db.pipelineStage.findFirst).toHaveBeenLastCalledWith({
      where: { pipelineId: "pB", name: "QA" },
    });
  });
});