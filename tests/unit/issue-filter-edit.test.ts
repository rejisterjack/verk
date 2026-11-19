import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));

import {
  addCondition,
  addGroup,
  BUILDER_FIELDS,
  cleanFilter,
  countConditions,
  defaultCondition,
  describeFilter,
  EMPTY_FILTER,
  removeNode,
  toggleGroupOp,
  updateNode,
  withField,
  withOp,
} from "@/lib/issue-filter-edit";
import {
  type Filter,
  FILTER_FIELDS,
  FILTER_SPEC,
  MAX_FILTER_CONDITIONS,
  MAX_FILTER_DEPTH,
  parseFilter,
} from "@/lib/issue-filter";

describe("defaultCondition", () => {
  it("builds a row that the parser accepts, for every field the builder offers", () => {
    for (const field of BUILDER_FIELDS) {
      const row = defaultCondition(field);

      // Some defaults (e.g. an empty text value) are unfinished on purpose; cleanFilter
      // drops those. Whatever survives cleaning must parse.
      const cleaned = cleanFilter({ op: "and", rules: [row] });

      if (cleaned) expect(() => parseFilter(cleaned), field).not.toThrow();
    }
  });

  it("starts each field on its first operator", () => {
    for (const field of FILTER_FIELDS) {
      expect(defaultCondition(field).op).toBe(FILTER_SPEC[field].ops[0]);
    }
  });

  it("picks useful starting values", () => {
    expect(defaultCondition("assignee")).toEqual({
      field: "assignee",
      op: "is",
      value: "me",
    });
    expect(defaultCondition("blocked")).toEqual({
      field: "blocked",
      op: "is",
      value: true,
    });
    expect(defaultCondition("label")).toEqual({
      field: "label",
      op: "includes_any",
      value: [],
    });
  });

  it("hides the parent field from the builder", () => {
    expect(BUILDER_FIELDS).not.toContain("parent");
  });
});

describe("withOp / withField", () => {
  it("wraps a single value when switching to a list operator", () => {
    expect(
      withOp({ field: "status", op: "is", value: "DONE" }, "in"),
    ).toEqual({ field: "status", op: "in", value: ["DONE"] });
  });

  it("unwraps to the first value when switching back", () => {
    expect(
      withOp({ field: "status", op: "in", value: ["TODO", "DONE"] }, "is"),
    ).toEqual({ field: "status", op: "is", value: "TODO" });
  });

  it("drops the value for is_empty and restores one afterwards", () => {
    const empty = withOp({ field: "assignee", op: "is", value: "me" }, "is_empty");

    expect(empty).toEqual({ field: "assignee", op: "is_empty" });
    expect(withOp(empty, "is")).toEqual({
      field: "assignee",
      op: "is",
      value: "me",
    });
  });

  it("resets the value when the kind of value changes", () => {
    const next = withOp({ field: "created", op: "within_last", value: 30 }, "before");

    expect(typeof next.value).toBe("string");
    expect(withOp({ field: "created", op: "before", value: "2026-01-01" }, "older_than").value).toBe(7);
  });

  it("ignores an operator the field does not support", () => {
    const row = { field: "status", op: "is", value: "TODO" } as const;

    expect(withOp(row, "contains")).toBe(row);
  });

  it("changing the field resets operator and value", () => {
    expect(
      withField({ field: "status", op: "in", value: ["TODO"] }, "priority"),
    ).toEqual(defaultCondition("priority"));
  });
});

describe("tree editing", () => {
  const base: Filter = {
    op: "and",
    rules: [
      { field: "status", op: "is", value: "TODO" },
      {
        op: "or",
        rules: [
          { field: "priority", op: "is", value: "HIGH" },
          { field: "assignee", op: "is_empty" },
        ],
      },
    ],
  };

  it("adds a row to the root and to a nested group", () => {
    const root = addCondition(base, [], "due");
    const nested = addCondition(base, [1], "label");

    expect(countConditions(root)).toBe(4);
    expect((root as { rules: unknown[] }).rules).toHaveLength(3);
    expect(countConditions(nested)).toBe(4);
  });

  it("does not change the tree it was given", () => {
    const copy = structuredClone(base);

    addCondition(base, [], "due");
    removeNode(base, [0]);
    toggleGroupOp(base, [1]);
    expect(base).toEqual(copy);
  });

  it("removes a row or a group, and clears everything when the root goes", () => {
    expect(countConditions(removeNode(base, [0]))).toBe(2);
    expect(countConditions(removeNode(base, [1]))).toBe(1);
    expect(removeNode(base, [])).toEqual(EMPTY_FILTER);
  });

  it("updates a row in place", () => {
    const next = updateNode(base, [1, 0], {
      field: "priority",
      op: "is",
      value: "LOW",
    });

    expect(JSON.stringify(next)).toContain('"LOW"');
    expect(JSON.stringify(next)).not.toContain('"HIGH"');
  });

  it("toggles AND / OR on a group", () => {
    expect((toggleGroupOp(base, [1]) as { rules: { op: string }[] }).rules[1]!.op).toBe(
      "and",
    );
    expect(toggleGroupOp(base, []).op).toBe("or");
  });

  it("ignores paths that point nowhere", () => {
    expect(addCondition(base, [9])).toBe(base);
    expect(addGroup(base, [0])).toBe(base); // a row, not a group
    expect(toggleGroupOp(base, [0, 0])).toBe(base);
  });

  it("adds a nested group that flips the operator", () => {
    const next = addGroup(EMPTY_FILTER, []) as { rules: { op: string }[] };

    expect(next.rules[0]!.op).toBe("or");
  });

  it("stops nesting at the depth limit", () => {
    let tree: Filter = EMPTY_FILTER;
    let path: number[] = [];

    for (let i = 0; i < MAX_FILTER_DEPTH + 3; i += 1) {
      const next = addGroup(tree, path);

      if (next === tree) break;
      tree = next;
      path = [...path, (tree as { rules: unknown[] }).rules.length - 1].slice(0, path.length + 1);
      // walk to the group just added
      let node: Filter = tree;

      path = [];
      while ("rules" in node && node.rules.some((rule) => "rules" in rule)) {
        const index = node.rules.findIndex((rule) => "rules" in rule);

        path.push(index);
        node = node.rules[index]!;
      }
    }
    expect(() => parseFilter(tree)).not.toThrow();
  });

  it("stops adding rows at the condition limit", () => {
    let tree: Filter = EMPTY_FILTER;

    for (let i = 0; i < MAX_FILTER_CONDITIONS + 10; i += 1) {
      tree = addCondition(tree, [], "status");
    }
    expect(countConditions(tree)).toBe(MAX_FILTER_CONDITIONS);
  });
});

describe("cleanFilter", () => {
  it("drops unfinished rows and empty groups", () => {
    const cleaned = cleanFilter({
      op: "and",
      rules: [
        { field: "title", op: "contains", value: "" },
        { field: "label", op: "includes_any", value: [] },
        { op: "or", rules: [] },
        { field: "status", op: "is", value: "TODO" },
      ],
    });

    expect(cleaned).toEqual({
      op: "and",
      rules: [{ field: "status", op: "is", value: "TODO" }],
    });
  });

  it("returns null when nothing is left", () => {
    expect(cleanFilter(EMPTY_FILTER)).toBeNull();
    expect(
      cleanFilter({ op: "and", rules: [{ field: "title", op: "contains", value: "" }] }),
    ).toBeNull();
  });

  it("keeps rows that need no value and strips a stray one", () => {
    expect(
      cleanFilter({
        op: "and",
        rules: [{ field: "assignee", op: "is_empty", value: "x" }],
      }),
    ).toEqual({ op: "and", rules: [{ field: "assignee", op: "is_empty" }] });
  });

  it("keeps a zero-length-safe boolean false", () => {
    expect(
      cleanFilter({ op: "and", rules: [{ field: "blocked", op: "is", value: false }] }),
    ).not.toBeNull();
  });
});

describe("describeFilter", () => {
  it("reads like a sentence", () => {
    expect(
      describeFilter({
        op: "and",
        rules: [
          { field: "status", op: "in", value: ["TODO", "DONE"] },
          { field: "assignee", op: "is_empty" },
        ],
      }),
    ).toBe("(status in TODO, DONE and assignee is empty)");
  });

  it("is empty for nothing", () => {
    expect(describeFilter(null)).toBe("");
    expect(describeFilter(EMPTY_FILTER)).toBe("");
  });
});