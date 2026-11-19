import { describe, expect, it } from "vitest";

import { capacityOverflow } from "@/lib/capacity";
import { assertStartNotAfterDue, issuesOnDay, monthRange } from "@/lib/dates";
import { cumulativeFlow, cycleTimeDays } from "@/lib/flow";
import { parseIssueQuery } from "@/lib/issue-query";
import { keyResultProgress } from "@/lib/key-results";
import { missingRequiredFields } from "@/lib/required-fields";
import { MAX_ACTIONS, MAX_AUTOMATIONS_PER_TEAM } from "@/lib/automations";

describe("planning helpers", () => {
  it("rejects a start after the due date", () => {
    expect(() =>
      assertStartNotAfterDue(new Date("2026-02-02"), new Date("2026-02-01")),
    ).toThrow(/Start date/);
    expect(() =>
      assertStartNotAfterDue(new Date("2026-02-01"), new Date("2026-02-02")),
    ).not.toThrow();
  });

  it("keeps person points inside the cycle cap", () => {
    expect(
      capacityOverflow(5, [
        { userId: "a", points: 3, daysOff: 0 },
        { userId: "b", points: 3, daysOff: 1 },
      ]),
    ).toEqual({ used: 6, teamCap: 5 });
    expect(capacityOverflow(null, [{ userId: "a", points: 9, daysOff: 0 }])).toBe(
      null,
    );
  });

  it("averages key results", () => {
    expect(
      keyResultProgress([
        { target: 10, current: 5 },
        { target: 4, current: 4 },
      ]),
    ).toBe(0.75);
    expect(keyResultProgress([])).toBeNull();
  });

  it("places an issue on the day it starts or is due", () => {
    const day = new Date("2026-03-15T00:00:00.000Z");
    const hits = issuesOnDay(
      [
        {
          id: "a",
          startDate: new Date("2026-03-15T12:00:00.000Z"),
          dueDate: null,
        },
        { id: "b", startDate: null, dueDate: new Date("2026-03-16T00:00:00.000Z") },
      ],
      day,
    );

    expect(hits.map((issue) => issue.id)).toEqual(["a"]);
    expect(monthRange(day).start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});

describe("workflow and reporting helpers", () => {
  it("names the empty required fields", () => {
    expect(
      missingRequiredFields(["assignee", "estimate", "dueDate"], {
        assigneeId: null,
        estimate: "NONE",
        dueDate: null,
        startDate: new Date(),
        projectId: "p",
        cycleId: "c",
      }),
    ).toEqual(["assignee", "estimate", "dueDate"]);
  });

  it("stacks cumulative flow and cycle time", () => {
    const flow = cumulativeFlow(
      [
        {
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
          status: "DONE",
          changes: [
            {
              at: new Date("2026-03-02T00:00:00.000Z"),
              status: "IN_PROGRESS",
            },
            { at: new Date("2026-03-03T00:00:00.000Z"), status: "DONE" },
          ],
        },
      ],
      ["2026-03-01", "2026-03-02", "2026-03-03"],
    );

    expect(flow[0]?.counts.BACKLOG).toBe(1);
    expect(flow[2]?.counts.DONE).toBe(1);
    expect(
      cycleTimeDays([
        {
          startedAt: new Date("2026-03-01T00:00:00.000Z"),
          completedAt: new Date("2026-03-03T00:00:00.000Z"),
        },
      ]),
    ).toEqual([2]);
  });

  it("compiles a short query into the filter tree", () => {
    expect(parseIssueQuery("status:TODO AND assignee:me")).toMatchObject({
      op: "and",
    });
    expect(parseIssueQuery('{"op":"and","rules":[]}')).toEqual({
      op: "and",
      rules: [],
    });
    expect(() => parseIssueQuery("status:nope")).toThrow();
  });

  it("raises the automation caps", () => {
    expect(MAX_AUTOMATIONS_PER_TEAM).toBe(100);
    expect(MAX_ACTIONS).toBe(10);
  });
});
