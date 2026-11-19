import { describe, expect, it } from "vitest";

import {
  MAX_ACTIONS,
  actionSchema,
  automationInputSchema,
  describeAction,
  fieldPatch,
  isFieldAction,
  parseActions,
  parseConditions,
  triggersFor,
  type AutomationAction,
} from "@/lib/automations";

describe("actionSchema", () => {
  it("accepts every documented action", () => {
    const actions: unknown[] = [
      { type: "set_status", status: "DONE" },
      { type: "set_priority", priority: "HIGH" },
      { type: "set_assignee", assigneeId: null },
      { type: "add_label", labelId: "l1" },
      { type: "remove_label", labelId: "l1" },
      { type: "set_cycle", cycleId: "c1" },
      { type: "set_project", projectId: null },
      { type: "add_comment", body: "hi" },
      { type: "notify", userId: "u1" },
    ];

    for (const action of actions) {
      expect(actionSchema.safeParse(action).success, JSON.stringify(action)).toBe(
        true,
      );
    }
  });

  it("refuses anything outside the closed list, so no free text is ever executed", () => {
    expect(actionSchema.safeParse({ type: "run_script", code: "x" }).success).toBe(false);
    expect(actionSchema.safeParse({ type: "set_status", status: "NOPE" }).success).toBe(false);
    expect(actionSchema.safeParse({ type: "add_comment", body: "" }).success).toBe(false);
    expect(actionSchema.safeParse({ type: "add_comment", body: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("automationInputSchema", () => {
  const base = {
    name: "  Close stale  ",
    trigger: "issue.status_changed",
    actions: [{ type: "set_priority", priority: "LOW" }],
  };

  it("trims the name and accepts a valid rule", () => {
    const parsed = automationInputSchema.parse(base);

    expect(parsed.name).toBe("Close stale");
  });

  it("needs a known trigger, a name, and actions inside the cap", () => {
    expect(automationInputSchema.safeParse({ ...base, trigger: "issue.deleted" }).success).toBe(false);
    expect(automationInputSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
    expect(automationInputSchema.safeParse({ ...base, actions: [] }).success).toBe(false);
    expect(
      automationInputSchema.safeParse({
        ...base,
        actions: Array.from({ length: MAX_ACTIONS + 1 }, () => base.actions[0]),
      }).success,
    ).toBe(false);
  });
});

describe("parseActions", () => {
  it("drops unknown or malformed stored actions instead of running them", () => {
    expect(
      parseActions([
        { type: "set_priority", priority: "LOW" },
        { type: "drop_database" },
        "garbage",
        null,
      ]),
    ).toEqual([{ type: "set_priority", priority: "LOW" }]);
  });

  it("caps the list and tolerates non-arrays", () => {
    const many = Array.from({ length: MAX_ACTIONS + 2 }, () => ({
      type: "notify",
      userId: "u",
    }));

    expect(parseActions(many)).toHaveLength(MAX_ACTIONS);
    expect(parseActions(null)).toEqual([]);
    expect(parseActions({ type: "notify", userId: "u" })).toEqual([]);
  });
});

describe("parseConditions", () => {
  it("treats missing or empty conditions as match-everything", () => {
    expect(parseConditions(null)).toBeNull();
    expect(parseConditions(undefined)).toBeNull();
    expect(parseConditions({ op: "and", rules: [] })).toBeNull();
  });

  it("keeps a real filter", () => {
    expect(
      parseConditions({ field: "priority", op: "is", value: "HIGH" }),
    ).not.toBeNull();
  });
});

describe("fieldPatch", () => {
  it("collapses field actions into one patch where later actions win", () => {
    const actions: AutomationAction[] = [
      { type: "set_status", status: "TODO" },
      { type: "set_status", status: "DONE" },
      { type: "set_assignee", assigneeId: null },
      { type: "add_comment", body: "ignored here" },
    ];

    expect(fieldPatch(actions)).toEqual({ status: "DONE", assigneeId: null });
  });

  it("ignores label, comment and notify actions", () => {
    expect(
      fieldPatch([
        { type: "add_label", labelId: "l" },
        { type: "notify", userId: "u" },
      ]),
    ).toEqual({});
  });

  it("tells field actions from the rest", () => {
    expect(isFieldAction({ type: "set_cycle", cycleId: null })).toBe(true);
    expect(isFieldAction({ type: "add_label", labelId: "l" })).toBe(false);
    expect(isFieldAction({ type: "add_comment", body: "x" })).toBe(false);
    expect(isFieldAction({ type: "notify", userId: "u" })).toBe(false);
  });
});

describe("triggersFor", () => {
  it("fires issue.created for a new issue", () => {
    expect(triggersFor("created")).toEqual(["issue.created"]);
  });

  it("maps each kind of change to its trigger, and several at once", () => {
    expect(triggersFor({ statusChanged: true })).toEqual(["issue.status_changed"]);
    expect(triggersFor({ priorityChanged: true, assigneeChanged: true })).toEqual([
      "issue.assigned",
      "issue.priority_changed",
    ]);
    expect(triggersFor({ labelsAdded: ["l1"] })).toEqual(["issue.label_added"]);
  });

  it("fires nothing when nothing relevant changed", () => {
    expect(triggersFor({})).toEqual([]);
    expect(triggersFor({ labelsAdded: [] })).toEqual([]);
  });
});

describe("describeAction", () => {
  it("reads naturally and uses names when it has them", () => {
    const users = new Map([["u1", "Ada"]]);
    const labels = new Map([["l1", "bug"]]);

    expect(describeAction({ type: "set_status", status: "IN_PROGRESS" })).toBe(
      "set status to in progress",
    );
    expect(describeAction({ type: "set_assignee", assigneeId: "u1" }, { users })).toBe(
      "assign to Ada",
    );
    expect(describeAction({ type: "set_assignee", assigneeId: null })).toBe(
      "assign to nobody",
    );
    expect(describeAction({ type: "add_label", labelId: "l1" }, { labels })).toBe(
      "add label bug",
    );
    expect(describeAction({ type: "remove_label", labelId: "zz" })).toBe(
      "remove label a label",
    );
    expect(describeAction({ type: "set_cycle", cycleId: null })).toBe(
      "remove from its cycle",
    );
  });

  it("shortens a long comment", () => {
    const text = describeAction({ type: "add_comment", body: "x".repeat(60) });

    expect(text.endsWith('…"')).toBe(true);
    expect(text.length).toBeLessThan(60);
  });
});