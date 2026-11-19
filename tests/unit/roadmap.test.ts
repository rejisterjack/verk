import { describe, expect, it } from "vitest";

import {
  buildRoadmap,
  combine,
  expectedProgress,
  projectRollup,
  suggestHealth,
  worstHealth,
  type InitiativeInput,
  type ProjectInput,
} from "@/lib/roadmap";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const NOW = d("2026-03-15");

function project(over: Partial<ProjectInput> = {}): ProjectInput {
  return {
    id: "p1",
    name: "Project",
    status: "IN_PROGRESS",
    startDate: null,
    targetDate: null,
    issues: { total: 0, done: 0, started: 0 },
    ...over,
  };
}

function initiative(over: Partial<InitiativeInput> = {}): InitiativeInput {
  return {
    id: "i1",
    name: "Initiative",
    parentId: null,
    targetDate: null,
    health: "ON_TRACK",
    projects: [],
    ...over,
  };
}

describe("projectRollup and combine", () => {
  it("is done over total, rounded", () => {
    expect(
      projectRollup(project({ issues: { total: 3, done: 1, started: 1 } })),
    ).toEqual({ total: 3, done: 1, percent: 33 });
  });

  it("treats an empty completed project as 100% and an empty open one as 0%", () => {
    expect(projectRollup(project({ status: "COMPLETED" })).percent).toBe(100);
    expect(projectRollup(project()).percent).toBe(0);
  });

  it("combines by summing counts, not by averaging percentages", () => {
    const result = combine([
      { total: 1, done: 1, percent: 100 },
      { total: 9, done: 0, percent: 0 },
    ]);

    expect(result).toEqual({ total: 10, done: 1, percent: 10 });
    expect(combine([])).toEqual({ total: 0, done: 0, percent: 0 });
  });
});

describe("expectedProgress", () => {
  it("is the share of the time window that has passed, clamped to 0..1", () => {
    expect(expectedProgress(d("2026-03-01"), d("2026-03-31"), NOW)).toBeCloseTo(
      14 / 30,
    );
    expect(expectedProgress(d("2026-04-01"), d("2026-05-01"), NOW)).toBe(0);
    expect(expectedProgress(d("2026-01-01"), d("2026-02-01"), NOW)).toBe(1);
  });

  it("is null without both dates or with a backwards window", () => {
    expect(expectedProgress(null, d("2026-03-31"), NOW)).toBeNull();
    expect(expectedProgress(d("2026-03-01"), null, NOW)).toBeNull();
    expect(expectedProgress(d("2026-03-31"), d("2026-03-01"), NOW)).toBeNull();
  });
});

describe("suggestHealth", () => {
  const rollup = (done: number, total: number) => ({
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
  });

  it("is ON_TRACK for finished or cancelled projects and for ones with no target", () => {
    expect(
      suggestHealth(
        { status: "COMPLETED", startDate: null, targetDate: d("2026-01-01"), rollup: rollup(0, 5) },
        NOW,
      ),
    ).toBe("ON_TRACK");
    expect(
      suggestHealth(
        { status: "IN_PROGRESS", startDate: null, targetDate: null, rollup: rollup(0, 5) },
        NOW,
      ),
    ).toBe("ON_TRACK");
  });

  it("is OFF_TRACK once the target has passed with work left", () => {
    expect(
      suggestHealth(
        { status: "IN_PROGRESS", startDate: null, targetDate: d("2026-03-01"), rollup: rollup(4, 5) },
        NOW,
      ),
    ).toBe("OFF_TRACK");
  });

  it("is fine once the target has passed and nothing is left", () => {
    expect(
      suggestHealth(
        { status: "IN_PROGRESS", startDate: null, targetDate: d("2026-03-01"), rollup: rollup(5, 5) },
        NOW,
      ),
    ).toBe("ON_TRACK");
  });

  it("compares progress to the clock when both dates exist", () => {
    const window = { status: "IN_PROGRESS", startDate: d("2026-03-01"), targetDate: d("2026-04-30") };

    // 14 of 60 days passed (23%): 0% done is 23 points behind -> AT_RISK.
    expect(suggestHealth({ ...window, rollup: rollup(0, 10) }, NOW)).toBe("AT_RISK");
    // 60 days, now far into it and nothing done -> OFF_TRACK.
    expect(
      suggestHealth({ ...window, rollup: rollup(0, 10) }, d("2026-04-15")),
    ).toBe("OFF_TRACK");
    expect(suggestHealth({ ...window, rollup: rollup(3, 10) }, NOW)).toBe("ON_TRACK");
  });

  it("flags a target within two weeks with under half done", () => {
    expect(
      suggestHealth(
        { status: "IN_PROGRESS", startDate: null, targetDate: d("2026-03-25"), rollup: rollup(1, 10) },
        NOW,
      ),
    ).toBe("AT_RISK");
  });
});

describe("worstHealth", () => {
  it("picks the worst, and defaults to ON_TRACK", () => {
    expect(worstHealth(["ON_TRACK", "OFF_TRACK", "AT_RISK"])).toBe("OFF_TRACK");
    expect(worstHealth(["ON_TRACK", "AT_RISK"])).toBe("AT_RISK");
    expect(worstHealth([])).toBe("ON_TRACK");
  });
});

describe("buildRoadmap", () => {
  it("nests a child initiative under its parent and rolls progress up", () => {
    const tree = buildRoadmap(
      [
        initiative({
          id: "parent",
          projects: [project({ id: "a", issues: { total: 2, done: 2, started: 0 } })],
        }),
        initiative({
          id: "child",
          parentId: "parent",
          projects: [project({ id: "b", issues: { total: 2, done: 0, started: 1 } })],
        }),
      ],
      NOW,
    );

    expect(tree).toHaveLength(1);
    expect(tree[0]!.children.map((c) => c.id)).toEqual(["child"]);
    expect(tree[0]!.rollup).toEqual({ total: 4, done: 2, percent: 50 });
    expect(tree[0]!.children[0]!.rollup.percent).toBe(0);
  });

  it("places an initiative at its target date, or at the latest project target under it", () => {
    const [own] = buildRoadmap([initiative({ targetDate: d("2026-06-01") })], NOW);
    const [fromProjects] = buildRoadmap(
      [
        initiative({
          projects: [
            project({ id: "a", targetDate: d("2026-05-01") }),
            project({ id: "b", targetDate: d("2026-07-01") }),
          ],
        }),
      ],
      NOW,
    );
    const [none] = buildRoadmap([initiative()], NOW);

    expect(own!.target).toEqual(d("2026-06-01"));
    expect(fromProjects!.target).toEqual(d("2026-07-01"));
    expect(none!.target).toBeNull();
  });

  it("takes the worst health of its projects and children, and shows the declared one too", () => {
    const [node] = buildRoadmap(
      [
        initiative({
          health: "AT_RISK",
          projects: [
            project({
              id: "late",
              targetDate: d("2026-03-01"),
              issues: { total: 4, done: 1, started: 1 },
            }),
          ],
        }),
      ],
      NOW,
    );

    expect(node!.health).toBe("OFF_TRACK");
    expect(node!.declaredHealth).toBe("AT_RISK");
  });

  it("treats an initiative whose parent is missing as a root", () => {
    const tree = buildRoadmap([initiative({ id: "orphan", parentId: "gone" })], NOW);

    expect(tree.map((n) => n.id)).toEqual(["orphan"]);
  });

  it("survives a cycle in parent links without looping or duplicating", () => {
    const tree = buildRoadmap(
      [
        initiative({ id: "a", parentId: "b" }),
        initiative({ id: "b", parentId: "a" }),
      ],
      NOW,
    );
    const ids: string[] = [];
    const walk = (nodes: typeof tree) =>
      nodes.forEach((node) => {
        ids.push(node.id);
        walk(node.children);
      });

    walk(tree);
    expect(new Set(ids).size).toBe(ids.length);
  });
});