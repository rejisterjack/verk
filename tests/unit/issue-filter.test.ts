import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));

import {
  compileFilter,
  FILTER_FIELDS,
  FILTER_SPEC,
  type Filter,
  isEmptyFilter,
  legacyToFilter,
  MAX_FILTER_CONDITIONS,
  MAX_FILTER_DEPTH,
  parseFilter,
  viewToFilter,
} from "@/lib/issue-filter";

const cid = (n: number) => `c${String(n).padStart(24, "0")}`;
const NOW = new Date("2026-06-15T12:00:00.000Z");

describe("parseFilter", () => {
  it("accepts a nested group", () => {
    const filter = parseFilter({
      op: "and",
      rules: [
        { field: "status", op: "in", value: ["TODO", "IN_PROGRESS"] },
        {
          op: "or",
          rules: [
            { field: "assignee", op: "is", value: "me" },
            { field: "assignee", op: "is_empty" },
          ],
        },
      ],
    });

    expect(filter).toMatchObject({ op: "and" });
  });

  it("accepts a JSON string", () => {
    expect(
      parseFilter('{"op":"and","rules":[{"field":"priority","op":"is","value":"HIGH"}]}'),
    ).toMatchObject({ op: "and" });
  });

  it("rejects malformed JSON and non-objects", () => {
    expect(() => parseFilter("{nope")).toThrow(/valid JSON/);
    expect(() => parseFilter(5)).toThrow(/object/);
    expect(() => parseFilter(null)).toThrow(/object/);
    expect(() => parseFilter([])).toThrow(/object/);
  });

  it("rejects an unknown field or operator", () => {
    expect(() =>
      parseFilter({ field: "password", op: "is", value: "x" }),
    ).toThrow(/unknown field/);
    expect(() =>
      parseFilter({ field: "status", op: "contains", value: "x" }),
    ).toThrow(/supports/);
    expect(() => parseFilter({ op: "xor", rules: [] })).toThrow(/"and" or "or"/);
  });

  it("rejects a value that does not fit the field", () => {
    expect(() => parseFilter({ field: "status", op: "is", value: "NOPE" })).toThrow(
      /one of/,
    );
    expect(() => parseFilter({ field: "number", op: "is", value: "5" })).toThrow(
      /whole number/,
    );
    expect(() => parseFilter({ field: "number", op: "gt", value: -1 })).toThrow();
    expect(() => parseFilter({ field: "blocked", op: "is", value: "yes" })).toThrow(
      /true or false/,
    );
    expect(() =>
      parseFilter({ field: "assignee", op: "is", value: "a b; DROP" }),
    ).toThrow(/user id/);
  });

  it("requires a list for in / includes and refuses empty or huge lists", () => {
    expect(() => parseFilter({ field: "status", op: "in", value: "TODO" })).toThrow(
      /list/,
    );
    expect(() => parseFilter({ field: "status", op: "in", value: [] })).toThrow(
      /list/,
    );
    expect(() =>
      parseFilter({
        field: "label",
        op: "includes_any",
        value: Array.from({ length: 51 }, (_, i) => cid(i)),
      }),
    ).toThrow(/at most/);
  });

  it("refuses a value on is_empty and demands one elsewhere", () => {
    expect(() =>
      parseFilter({ field: "assignee", op: "is_empty", value: "x" }),
    ).toThrow(/no value/);
    expect(() => parseFilter({ field: "title", op: "contains" })).toThrow();
  });

  it("limits nesting depth and the number of conditions", () => {
    let nested: unknown = { field: "status", op: "is", value: "TODO" };

    for (let i = 0; i <= MAX_FILTER_DEPTH; i += 1) {
      nested = { op: "and", rules: [nested] };
    }
    expect(() => parseFilter(nested)).toThrow(/nest/);

    const wide = {
      op: "and",
      rules: Array.from({ length: MAX_FILTER_CONDITIONS + 1 }, () => ({
        field: "status",
        op: "is",
        value: "TODO",
      })),
    };

    expect(() => parseFilter(wide)).toThrow(/at most/);
  });

  it("only allows the active-cycle shortcut with is / is_not", () => {
    expect(
      parseFilter({ field: "cycle", op: "is", value: "active" }),
    ).toMatchObject({ value: "active" });
    expect(() =>
      parseFilter({ field: "cycle", op: "in", value: ["active"] }),
    ).toThrow();
  });

  it("de-duplicates list values", () => {
    expect(
      parseFilter({ field: "status", op: "in", value: ["TODO", "TODO"] }),
    ).toMatchObject({ value: ["TODO"] });
  });

  it("every field has a spec with at least one operator", () => {
    for (const field of FILTER_FIELDS) {
      expect(FILTER_SPEC[field].ops.length, field).toBeGreaterThan(0);
    }
  });
});

describe("compileFilter", () => {
  const compile = (input: unknown, userId: string | null = "u1") =>
    compileFilter(parseFilter(input), { userId, now: NOW });

  it("compiles an empty filter to {}", () => {
    expect(compileFilter(null)).toEqual({});
    expect(compile({ op: "and", rules: [] })).toEqual({});
    expect(isEmptyFilter(parseFilter({ op: "or", rules: [{ op: "and", rules: [] }] }))).toBe(
      true,
    );
  });

  it("maps simple equality and membership", () => {
    expect(compile({ field: "status", op: "is", value: "TODO" })).toEqual({
      status: "TODO",
    });
    expect(
      compile({ field: "priority", op: "in", value: ["HIGH", "URGENT"] }),
    ).toEqual({ priority: { in: ["HIGH", "URGENT"] } });
  });

  it("treats 'is not' on a nullable field as including unset", () => {
    expect(
      compile({ field: "assignee", op: "is_not", value: cid(1) }),
    ).toEqual({ OR: [{ assigneeId: null }, { assigneeId: { not: cid(1) } }] });
    // a non-nullable column does not need the null branch
    expect(compile({ field: "status", op: "is_not", value: "DONE" })).toEqual({
      status: { not: "DONE" },
    });
  });

  it("resolves 'me' to the signed-in user and refuses it when anonymous", () => {
    expect(compile({ field: "assignee", op: "is", value: "me" })).toEqual({
      assigneeId: "u1",
    });
    expect(() =>
      compile({ field: "assignee", op: "is", value: "me" }, null),
    ).toThrow(/signed-in/);
    expect(
      compile({ field: "creator", op: "in", value: ["me", cid(2)] }),
    ).toEqual({ creatorId: { in: ["u1", cid(2)] } });
  });

  it("handles empty / not empty", () => {
    expect(compile({ field: "project", op: "is_empty" })).toEqual({
      projectId: null,
    });
    expect(compile({ field: "parent", op: "is_not_empty" })).toEqual({
      parentId: { not: null },
    });
  });

  it("compiles the active-cycle shortcut", () => {
    expect(compile({ field: "cycle", op: "is", value: "active" })).toEqual({
      cycle: { isActive: true },
    });
    expect(compile({ field: "cycle", op: "is_not", value: "active" })).toEqual({
      OR: [{ cycleId: null }, { cycle: { isActive: false } }],
    });
  });

  it("compiles label operators", () => {
    expect(
      compile({ field: "label", op: "includes_any", value: [cid(1), cid(2)] }),
    ).toEqual({ labels: { some: { labelId: { in: [cid(1), cid(2)] } } } });
    expect(
      compile({ field: "label", op: "includes_all", value: [cid(1), cid(2)] }),
    ).toEqual({
      AND: [
        { labels: { some: { labelId: cid(1) } } },
        { labels: { some: { labelId: cid(2) } } },
      ],
    });
    expect(
      compile({ field: "label", op: "includes_none", value: [cid(1)] }),
    ).toEqual({ NOT: { labels: { some: { labelId: { in: [cid(1)] } } } } });
    expect(compile({ field: "label", op: "is_empty" })).toEqual({
      labels: { none: {} },
    });
  });

  it("compiles text and number operators", () => {
    expect(compile({ field: "title", op: "contains", value: "login" })).toEqual({
      title: { contains: "login", mode: "insensitive" },
    });
    expect(
      compile({ field: "description", op: "not_contains", value: "x" }),
    ).toEqual({ NOT: { description: { contains: "x", mode: "insensitive" } } });
    expect(compile({ field: "number", op: "gte", value: 10 })).toEqual({
      number: { gte: 10 },
    });
  });

  it("compiles date operators against a fixed clock", () => {
    expect(
      compile({ field: "created", op: "before", value: "2026-03-01" }),
    ).toEqual({ createdAt: { lt: new Date("2026-03-01T00:00:00.000Z") } });
    expect(
      compile({ field: "created", op: "after", value: "2026-03-01" }),
    ).toEqual({ createdAt: { gte: new Date("2026-03-02T00:00:00.000Z") } });
    expect(compile({ field: "due", op: "on", value: "2026-03-01" })).toEqual({
      dueDate: {
        gte: new Date("2026-03-01T00:00:00.000Z"),
        lt: new Date("2026-03-02T00:00:00.000Z"),
      },
    });
    expect(compile({ field: "updated", op: "within_last", value: 7 })).toEqual({
      updatedAt: { gte: new Date("2026-06-08T12:00:00.000Z"), lte: NOW },
    });
    expect(compile({ field: "due", op: "within_next", value: 3 })).toEqual({
      dueDate: { gte: NOW, lte: new Date("2026-06-18T12:00:00.000Z") },
    });
    expect(compile({ field: "created", op: "older_than", value: 30 })).toEqual({
      createdAt: { lt: new Date("2026-05-16T12:00:00.000Z") },
    });
    expect(compile({ field: "due", op: "is_empty" })).toEqual({ dueDate: null });
  });

  it("compiles blocked and has_sub_issues, including the negated form", () => {
    const blocked = compile({ field: "blocked", op: "is", value: true });

    expect(blocked).toHaveProperty("relationsFrom");
    expect(compile({ field: "blocked", op: "is", value: false })).toEqual({
      NOT: blocked,
    });
    expect(compile({ field: "has_sub_issues", op: "is", value: true })).toEqual({
      children: { some: { archivedAt: null } },
    });
  });

  it("compiles subscriber and label_group", () => {
    expect(compile({ field: "subscriber", op: "is", value: "me" })).toEqual({
      subscriptions: { some: { userId: "u1" } },
    });
    expect(compile({ field: "label_group", op: "is", value: "Area" })).toEqual({
      labels: { some: { label: { group: "Area" } } },
    });
  });

  it("combines groups with AND / OR and unwraps single rules", () => {
    const where = compile({
      op: "or",
      rules: [
        { field: "status", op: "is", value: "TODO" },
        {
          op: "and",
          rules: [
            { field: "priority", op: "is", value: "URGENT" },
            { field: "assignee", op: "is_empty" },
          ],
        },
      ],
    });

    expect(where).toEqual({
      OR: [
        { status: "TODO" },
        { AND: [{ priority: "URGENT" }, { assigneeId: null }] },
      ],
    });
    // one real rule + one empty group collapses to just the rule
    expect(
      compile({
        op: "and",
        rules: [{ field: "status", op: "is", value: "TODO" }, { op: "or", rules: [] }],
      }),
    ).toEqual({ status: "TODO" });
  });

  it("never lets user text reach a column name", () => {
    // field names are an allow-list; a crafted one is rejected at parse time
    expect(() =>
      parseFilter({ field: "teamId", op: "is", value: "other" }),
    ).toThrow(/unknown field/);
    expect(() =>
      parseFilter({ field: "status; DROP TABLE", op: "is", value: "x" }),
    ).toThrow();
  });
});

describe("legacy saved views", () => {
  it("turns a flat view into a filter", () => {
    const filter = legacyToFilter({
      status: "TODO",
      priority: "HIGH",
      cycleId: cid(1),
      assigneeId: cid(2),
      labelGroup: "Area",
    }) as Filter;

    expect(compileFilter(filter, { userId: "u1" })).toEqual({
      AND: [
        { status: "TODO" },
        { priority: "HIGH" },
        { cycleId: cid(1) },
        { assigneeId: cid(2) },
        { labels: { some: { label: { group: "Area" } } } },
      ],
    });
  });

  it("turns a search into title/description/number matches", () => {
    const filter = legacyToFilter({ search: "42" }) as Filter;
    const where = compileFilter(filter, {});

    expect(JSON.stringify(where)).toContain('"number":42');
    expect(JSON.stringify(where)).toContain('"title"');
  });

  it("ignores junk values instead of throwing", () => {
    expect(legacyToFilter({ status: "NOPE", cycleId: "a b c" })).toBeNull();
    expect(legacyToFilter(null)).toBeNull();
    expect(legacyToFilter({})).toBeNull();
  });

  it("viewToFilter reads v2 and legacy, and drops a broken v2", () => {
    expect(
      viewToFilter({
        version: 2,
        filter: { op: "and", rules: [{ field: "status", op: "is", value: "TODO" }] },
      }),
    ).toMatchObject({ op: "and" });
    expect(viewToFilter({ status: "TODO" })).toMatchObject({ op: "and" });
    expect(viewToFilter({ version: 2, filter: { field: "bad" } })).toBeNull();
    expect(viewToFilter("nope")).toBeNull();
  });
});