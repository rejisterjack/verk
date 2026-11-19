import { describe, expect, it } from "vitest";

import {
  burndown,
  daysBetween,
  lifecycleStamps,
  scopeChange,
  startOfUtcDay,
  velocity,
  type CycleIssueRow,
} from "@/lib/cycle-stats";

const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

function row(over: Partial<CycleIssueRow> = {}): CycleIssueRow {
  return {
    estimate: "THREE",
    status: "TODO",
    createdAt: d("2026-03-01"),
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    ...over,
  };
}

const cycle = { startDate: d("2026-03-02"), endDate: d("2026-03-06") };

describe("daysBetween", () => {
  it("lists every UTC day inclusive", () => {
    const days = daysBetween(d("2026-03-02"), d("2026-03-04"));

    expect(days.map((day) => day.toISOString().slice(0, 10))).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
    ]);
  });

  it("is capped so a bad range cannot explode", () => {
    expect(daysBetween(d("2020-01-01"), d("2030-01-01"))).toHaveLength(120);
    expect(daysBetween(d("2026-03-05"), d("2026-03-02"))).toHaveLength(0);
  });

  it("normalises to midnight UTC", () => {
    expect(startOfUtcDay(new Date("2026-03-02T23:59:59Z")).toISOString()).toBe(
      "2026-03-02T00:00:00.000Z",
    );
  });
});

describe("burndown", () => {
  const now = d("2026-03-04");

  it("starts from the baseline scope and ends the ideal line at zero", () => {
    const points = burndown([row(), row({ estimate: "FIVE" })], cycle, { now });

    expect(points).toHaveLength(5);
    expect(points[0]!.scope).toBe(8);
    expect(points[0]!.ideal).toBe(8);
    expect(points.at(-1)!.ideal).toBe(0);
  });

  it("counts an issue as done from the day it completed", () => {
    const points = burndown(
      [row({ completedAt: d("2026-03-03"), status: "DONE" })],
      cycle,
      { now },
    );

    expect(points.map((p) => p.done)).toEqual([0, 3, 3, 3, 3]);
    expect(points.map((p) => p.remaining)).toEqual([3, 0, 0, 0, 0]);
  });

  it("adds scope on the day an issue joins (scope is 'by the end of the day'), so scope creep shows", () => {
    // Joined at noon on 4 March: counts on 4 March and every day after, not on 2 or 3 March.
    const points = burndown(
      [row(), row({ createdAt: d("2026-03-04"), estimate: "TWO" })],
      cycle,
      { now },
    );

    expect(points.map((p) => p.day)).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
    ]);
    expect(points.map((p) => p.scope)).toEqual([3, 3, 5, 5, 5]);
  });

  it("removes a cancelled issue from scope instead of leaving it unfinished", () => {
    const points = burndown([row({ canceledAt: d("2026-03-03") })], cycle, {
      now,
    });

    expect(points.map((p) => p.scope)).toEqual([3, 0, 0, 0, 0]);
  });

  it("marks days after today as future", () => {
    const points = burndown([row()], cycle, { now });

    expect(points.map((p) => p.future)).toEqual([
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it("can count issues instead of points", () => {
    const points = burndown([row({ estimate: "NONE" })], cycle, {
      now,
      unit: "issues",
    });

    expect(points[0]!.scope).toBe(1);
  });

  it("handles a cycle with nothing in it", () => {
    const points = burndown([], cycle, { now });

    expect(points.every((p) => p.scope === 0 && p.ideal === 0)).toBe(true);
  });
});

describe("scopeChange", () => {
  it("measures work added after the start as a share of the starting scope", () => {
    const result = scopeChange(
      [
        row({ estimate: "FIVE" }),
        row({ estimate: "FIVE" }),
        row({ estimate: "FIVE", createdAt: d("2026-03-04") }),
      ],
      cycle,
    );

    expect(result.added).toBe(5);
    expect(result.creepPercent).toBe(50);
  });

  it("counts cancelled work as removed", () => {
    expect(
      scopeChange([row({ canceledAt: d("2026-03-03") })], cycle).removed,
    ).toBe(3);
  });

  it("reports 100% creep when everything was added after the start, and 0 for an empty cycle", () => {
    expect(
      scopeChange([row({ createdAt: d("2026-03-04") })], cycle).creepPercent,
    ).toBe(100);
    expect(scopeChange([], cycle).creepPercent).toBe(0);
  });

  it("uses addedToCycleAt over createdAt when known", () => {
    const result = scopeChange(
      [row({ createdAt: d("2026-02-01"), addedToCycleAt: d("2026-03-04") })],
      cycle,
    );

    expect(result.added).toBe(3);
  });
});

describe("velocity", () => {
  const now = d("2026-03-20");
  const finished = (name: string, end: string, issues: CycleIssueRow[]) => ({
    name,
    endDate: d(end),
    issues,
  });

  it("returns planned and completed per cycle, oldest first, ignoring cancelled work", () => {
    const result = velocity(
      [
        finished("C2", "2026-03-15", [
          row({ completedAt: d("2026-03-10") }),
          row({ canceledAt: d("2026-03-11") }),
        ]),
        finished("C1", "2026-03-01", [row({ completedAt: d("2026-02-20") })]),
      ],
      { now },
    );

    expect(result.points.map((p) => p.name)).toEqual(["C1", "C2"]);
    expect(result.points[1]).toEqual({ name: "C2", planned: 3, completed: 3 });
  });

  it("averages only finished cycles", () => {
    const result = velocity(
      [
        finished("done", "2026-03-01", [
          row({ completedAt: d("2026-02-20"), estimate: "EIGHT" }),
        ]),
        finished("open", "2026-04-01", [
          row({ completedAt: d("2026-03-10"), estimate: "THIRTEEN" }),
        ]),
      ],
      { now },
    );

    expect(result.average).toBe(8);
  });

  it("is zero with no finished cycles, and keeps only the last N", () => {
    expect(velocity([], { now })).toEqual({ points: [], average: 0 });
    const many = Array.from({ length: 10 }, (_, i) =>
      finished(`C${i}`, `2026-01-${String(i + 1).padStart(2, "0")}`, []),
    );

    expect(velocity(many, { now, last: 3 }).points).toHaveLength(3);
  });
});

describe("lifecycleStamps", () => {
  const none = { startedAt: null, completedAt: null, canceledAt: null };
  const now = d("2026-03-05");

  it("does nothing when the status is unchanged", () => {
    expect(lifecycleStamps("TODO", "TODO", none, now)).toEqual({});
  });

  it("stamps started when work begins, once", () => {
    expect(lifecycleStamps("TODO", "IN_PROGRESS", none, now)).toEqual({
      startedAt: now,
    });
    expect(
      lifecycleStamps("TODO", "IN_PROGRESS", { ...none, startedAt: d("2026-03-01") }, now),
    ).toEqual({});
  });

  it("stamps both started and completed when an issue jumps straight to done", () => {
    expect(lifecycleStamps("TODO", "DONE", none, now)).toEqual({
      startedAt: now,
      completedAt: now,
    });
  });

  it("stamps cancelled", () => {
    expect(lifecycleStamps("TODO", "CANCELLED", none, now)).toEqual({
      canceledAt: now,
    });
  });

  it("clears the finish stamp when an issue is reopened, so it un-burns", () => {
    const done = { ...none, startedAt: d("2026-03-01"), completedAt: d("2026-03-03") };

    expect(lifecycleStamps("DONE", "IN_PROGRESS", done, now)).toEqual({
      completedAt: null,
    });
    expect(
      lifecycleStamps("CANCELLED", "TODO", { ...none, canceledAt: d("2026-03-03") }, now),
    ).toEqual({ canceledAt: null });
  });
});