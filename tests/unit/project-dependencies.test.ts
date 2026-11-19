import { describe, expect, it } from "vitest";

import {
  MAX_DEPENDENCIES_PER_PROJECT,
  checkNewDependency,
  dependencyConflicts,
  reachable,
  readyProjects,
  type DatedProject,
  type DependencyEdge,
} from "@/lib/project-dependencies";

const edge = (projectId: string, dependsOnId: string): DependencyEdge => ({
  projectId,
  dependsOnId,
});
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

function project(over: Partial<DatedProject> & { id: string }): DatedProject {
  return {
    name: over.id.toUpperCase(),
    status: "PLANNED",
    startDate: null,
    targetDate: null,
    ...over,
  };
}

describe("reachable", () => {
  it("follows depends-on links transitively and never includes the start", () => {
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "d")];

    expect([...reachable(edges, "a")].sort()).toEqual(["b", "c", "d"]);
    expect([...reachable(edges, "c")]).toEqual(["d"]);
    expect([...reachable(edges, "d")]).toEqual([]);
  });

  it("terminates on a loop that already exists in the data", () => {
    const edges = [edge("a", "b"), edge("b", "a")];

    expect([...reachable(edges, "a")]).toEqual(["b"]);
  });
});

describe("checkNewDependency", () => {
  it("accepts a plain new dependency", () => {
    expect(checkNewDependency([], "a", "b")).toEqual({ ok: true });
    expect(checkNewDependency([edge("a", "b")], "a", "c")).toEqual({ ok: true });
  });

  it("refuses a project that depends on itself", () => {
    expect(checkNewDependency([], "a", "a")).toEqual({
      ok: false,
      reason: "self",
    });
  });

  it("refuses a duplicate", () => {
    expect(checkNewDependency([edge("a", "b")], "a", "b")).toEqual({
      ok: false,
      reason: "duplicate",
    });
  });

  it("refuses a direct loop", () => {
    expect(checkNewDependency([edge("a", "b")], "b", "a")).toEqual({
      ok: false,
      reason: "cycle",
    });
  });

  it("refuses a loop closed through several projects", () => {
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "d")];

    expect(checkNewDependency(edges, "d", "a")).toEqual({
      ok: false,
      reason: "cycle",
    });
  });

  it("allows a diamond, which is not a loop", () => {
    const edges = [edge("a", "b"), edge("a", "c"), edge("b", "d")];

    expect(checkNewDependency(edges, "c", "d")).toEqual({ ok: true });
  });

  it("caps how many projects one project can wait on", () => {
    const edges = Array.from({ length: MAX_DEPENDENCIES_PER_PROJECT }, (_, i) =>
      edge("a", `dep${i}`),
    );

    expect(checkNewDependency(edges, "a", "one-more")).toEqual({
      ok: false,
      reason: "limit",
    });
  });
});

describe("dependencyConflicts", () => {
  it("flags a project that starts before the project it waits on is due", () => {
    const result = dependencyConflicts(
      [
        project({ id: "a", startDate: d("2026-03-01"), targetDate: d("2026-06-01") }),
        project({ id: "b", targetDate: d("2026-04-01") }),
      ],
      [edge("a", "b")],
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.kind).toBe("starts_before_finish");
    expect(result[0]!.message).toContain("2026-04-01");
  });

  it("falls back to the due date when there is no start date", () => {
    const result = dependencyConflicts(
      [
        project({ id: "a", targetDate: d("2026-03-15") }),
        project({ id: "b", targetDate: d("2026-04-01") }),
      ],
      [edge("a", "b")],
    );

    expect(result[0]!.kind).toBe("target_before_finish");
  });

  it("has no conflict when the schedule respects the dependency", () => {
    expect(
      dependencyConflicts(
        [
          project({ id: "a", startDate: d("2026-04-02"), targetDate: d("2026-06-01") }),
          project({ id: "b", targetDate: d("2026-04-01") }),
        ],
        [edge("a", "b")],
      ),
    ).toEqual([]);
  });

  it("ignores a completed dependency and a project that is itself finished", () => {
    const projects = [
      project({ id: "a", startDate: d("2026-03-01") }),
      project({ id: "b", status: "COMPLETED", targetDate: d("2026-04-01") }),
      project({ id: "c", status: "COMPLETED", startDate: d("2026-03-01") }),
      project({ id: "e", targetDate: d("2026-04-01") }),
    ];

    expect(dependencyConflicts(projects, [edge("a", "b")])).toEqual([]);
    expect(dependencyConflicts(projects, [edge("c", "e")])).toEqual([]);
  });

  it("always reports a dependency on a cancelled project", () => {
    const result = dependencyConflicts(
      [project({ id: "a" }), project({ id: "b", status: "CANCELLED" })],
      [edge("a", "b")],
    );

    expect(result[0]!.kind).toBe("blocked_by_cancelled");
  });

  it("skips edges whose projects are not in the list, and undated blockers", () => {
    expect(
      dependencyConflicts([project({ id: "a", startDate: d("2026-03-01") })], [edge("a", "gone")]),
    ).toEqual([]);
    expect(
      dependencyConflicts(
        [project({ id: "a", startDate: d("2026-03-01") }), project({ id: "b" })],
        [edge("a", "b")],
      ),
    ).toEqual([]);
  });
});

describe("readyProjects", () => {
  it("lists unstarted projects whose dependencies are all completed", () => {
    const projects = [
      project({ id: "a" }),
      project({ id: "b", status: "COMPLETED" }),
      project({ id: "c", status: "IN_PROGRESS" }),
      project({ id: "d" }),
      project({ id: "e", status: "BACKLOG" }),
    ];
    const edges = [edge("a", "b"), edge("d", "c"), edge("e", "b"), edge("e", "d")];

    expect(readyProjects(projects, edges).sort()).toEqual(["a"]);
  });

  it("treats a project with no dependencies as ready, but not one already underway", () => {
    expect(
      readyProjects(
        [project({ id: "a" }), project({ id: "b", status: "IN_PROGRESS" })],
        [],
      ),
    ).toEqual(["a"]);
  });
});