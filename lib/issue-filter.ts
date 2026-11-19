/**
 * Issue filters as data: a tree of AND / OR groups over simple conditions.
 *
 *   { op: "and", rules: [
 *       { field: "status", op: "in", value: ["TODO", "IN_PROGRESS"] },
 *       { op: "or", rules: [
 *           { field: "assignee", op: "is", value: "me" },
 *           { field: "assignee", op: "is_empty" } ] } ] }
 *
 * `parseFilter` checks untrusted input (URL, API body, saved view) and `compileFilter` turns
 * it into a Prisma `where`. Both are pure, so the same filter drives lists, boards, saved
 * views, MCP and the API. An empty group matches everything.
 */
import type { Prisma } from "@/lib/generated/prisma/client";

import { AuthError } from "@/lib/errors";
import {
  estimateSchema,
  issueStatusSchema,
  prioritySchema,
} from "@/lib/validators";

export const MAX_FILTER_DEPTH = 4;
export const MAX_FILTER_CONDITIONS = 40;
export const MAX_FILTER_VALUES = 50;

export const FILTER_FIELDS = [
  "status",
  "priority",
  "estimate",
  "assignee",
  "creator",
  "subscriber",
  "project",
  "cycle",
  "milestone",
  "parent",
  "workflow_status",
  "label",
  "label_group",
  "title",
  "description",
  "number",
  "created",
  "updated",
  "due",
  "start",
  "blocked",
  "has_sub_issues",
] as const;
export type FilterField = (typeof FILTER_FIELDS)[number];

export const FILTER_OPS = [
  "is",
  "is_not",
  "in",
  "not_in",
  "is_empty",
  "is_not_empty",
  "includes_any",
  "includes_all",
  "includes_none",
  "contains",
  "not_contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "before",
  "after",
  "on",
  "within_last",
  "within_next",
  "older_than",
] as const;
export type FilterOp = (typeof FILTER_OPS)[number];

export type FilterValue = string | number | boolean | string[];
export type Condition = {
  field: FilterField;
  op: FilterOp;
  value?: FilterValue;
};
export type Group = { op: "and" | "or"; rules: Filter[] };
export type Filter = Condition | Group;

export type FieldKind =
  "enum" | "person" | "ref" | "labels" | "text" | "number" | "date" | "bool";

const SCALAR_OPS = ["is", "is_not", "in", "not_in"] as const;
const NULLABLE_OPS = [...SCALAR_OPS, "is_empty", "is_not_empty"] as const;
const DATE_OPS = [
  "before",
  "after",
  "on",
  "within_last",
  "within_next",
  "older_than",
] as const;

export type FieldSpec = {
  kind: FieldKind;
  ops: readonly FilterOp[];
  options?: readonly string[];
  label: string;
};

export const FILTER_SPEC: Record<FilterField, FieldSpec> = {
  status: {
    kind: "enum",
    ops: SCALAR_OPS,
    options: issueStatusSchema.options,
    label: "Status",
  },
  priority: {
    kind: "enum",
    ops: SCALAR_OPS,
    options: prioritySchema.options,
    label: "Priority",
  },
  estimate: {
    kind: "enum",
    ops: SCALAR_OPS,
    options: estimateSchema.options,
    label: "Estimate",
  },
  assignee: { kind: "person", ops: NULLABLE_OPS, label: "Assignee" },
  creator: { kind: "person", ops: SCALAR_OPS, label: "Creator" },
  subscriber: { kind: "person", ops: ["is", "is_not"], label: "Subscriber" },
  project: { kind: "ref", ops: NULLABLE_OPS, label: "Project" },
  cycle: { kind: "ref", ops: NULLABLE_OPS, label: "Cycle" },
  milestone: { kind: "ref", ops: NULLABLE_OPS, label: "Milestone" },
  parent: { kind: "ref", ops: NULLABLE_OPS, label: "Parent issue" },
  workflow_status: { kind: "ref", ops: SCALAR_OPS, label: "Workflow status" },
  label: {
    kind: "labels",
    ops: [
      "includes_any",
      "includes_all",
      "includes_none",
      "is_empty",
      "is_not_empty",
    ],
    label: "Labels",
  },
  label_group: { kind: "text", ops: ["is", "is_not"], label: "Label group" },
  title: { kind: "text", ops: ["contains", "not_contains"], label: "Title" },
  description: {
    kind: "text",
    ops: ["contains", "not_contains"],
    label: "Description",
  },
  number: {
    kind: "number",
    ops: ["is", "is_not", "gt", "gte", "lt", "lte"],
    label: "Number",
  },
  created: { kind: "date", ops: DATE_OPS, label: "Created" },
  updated: { kind: "date", ops: DATE_OPS, label: "Updated" },
  due: {
    kind: "date",
    ops: [...DATE_OPS, "is_empty", "is_not_empty"],
    label: "Due date",
  },
  start: {
    kind: "date",
    ops: [...DATE_OPS, "is_empty", "is_not_empty"],
    label: "Start date",
  },
  blocked: { kind: "bool", ops: ["is"], label: "Blocked" },
  has_sub_issues: { kind: "bool", ops: ["is"], label: "Has sub-issues" },
};

export class FilterError extends AuthError {
  constructor(message: string) {
    super(message, "BAD_REQUEST", 400);
  }
}

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isGroup(node: Filter): node is Group {
  return "rules" in node;
}

function scalarValue(
  field: FilterField,
  spec: FieldSpec,
  op: FilterOp,
  raw: unknown,
  path: string,
): string | number | boolean {
  switch (spec.kind) {
    case "enum": {
      if (typeof raw !== "string" || !spec.options?.includes(raw)) {
        throw new FilterError(
          `${path}: ${spec.label} must be one of ${spec.options?.join(", ")}`,
        );
      }

      return raw;
    }
    case "person": {
      if (raw === "me") return raw;
      if (typeof raw !== "string" || !ID_RE.test(raw)) {
        throw new FilterError(
          `${path}: ${spec.label} must be "me" or a user id`,
        );
      }

      return raw;
    }
    case "ref": {
      if (field === "cycle" && raw === "active") {
        if (op !== "is" && op !== "is_not") {
          throw new FilterError(
            `${path}: "active" works with is / is_not only`,
          );
        }

        return raw;
      }
      if (typeof raw !== "string" || !ID_RE.test(raw)) {
        throw new FilterError(`${path}: ${spec.label} must be an id`);
      }

      return raw;
    }
    case "number": {
      if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
        throw new FilterError(`${path}: ${spec.label} must be a whole number`);
      }

      return raw;
    }
    case "bool": {
      if (typeof raw !== "boolean") {
        throw new FilterError(`${path}: ${spec.label} must be true or false`);
      }

      return raw;
    }
    default: {
      if (typeof raw !== "string" || !raw.trim() || raw.length > 80) {
        throw new FilterError(
          `${path}: ${spec.label} needs a short text value`,
        );
      }

      return raw;
    }
  }
}

function listValue(
  field: FilterField,
  spec: FieldSpec,
  op: FilterOp,
  raw: unknown,
  path: string,
): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new FilterError(`${path}: expected a non-empty list`);
  }
  if (raw.length > MAX_FILTER_VALUES) {
    throw new FilterError(`${path}: at most ${MAX_FILTER_VALUES} values`);
  }
  const items = raw.map((item) => {
    const value =
      spec.kind === "labels"
        ? scalarValue(field, { ...spec, kind: "ref" }, op, item, path)
        : scalarValue(field, spec, op, item, path);

    if (typeof value !== "string" || value === "active") {
      throw new FilterError(`${path}: invalid list value`);
    }

    return value;
  });

  return [...new Set(items)];
}

function dayValue(raw: unknown, path: string): string {
  if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) {
    throw new FilterError(`${path}: expected a date such as 2026-03-01`);
  }

  return new Date(raw).toISOString().slice(0, 10);
}

function parseValue(
  field: FilterField,
  spec: FieldSpec,
  op: FilterOp,
  raw: unknown,
  path: string,
): FilterValue | undefined {
  switch (op) {
    case "is_empty":
    case "is_not_empty":
      if (raw !== undefined && raw !== null) {
        throw new FilterError(`${path}: ${op} takes no value`);
      }

      return undefined;
    case "is":
    case "is_not":
      return scalarValue(field, spec, op, raw, path);
    case "in":
    case "not_in":
    case "includes_any":
    case "includes_all":
    case "includes_none":
      return listValue(field, spec, op, raw, path);
    case "contains":
    case "not_contains": {
      if (typeof raw !== "string" || !raw.trim() || raw.length > 200) {
        throw new FilterError(`${path}: expected text (1 to 200 characters)`);
      }

      return raw.trim();
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return scalarValue(field, { ...spec, kind: "number" }, op, raw, path);
    case "before":
    case "after":
    case "on":
      return dayValue(raw, path);
    case "within_last":
    case "within_next":
    case "older_than": {
      if (
        typeof raw !== "number" ||
        !Number.isInteger(raw) ||
        raw < 1 ||
        raw > 3650
      ) {
        throw new FilterError(`${path}: expected a number of days (1 to 3650)`);
      }

      return raw;
    }
    default:
      throw new FilterError(`${path}: unknown operator`);
  }
}

type Counter = { conditions: number };

function parseNode(
  node: unknown,
  depth: number,
  counter: Counter,
  path: string,
): Filter {
  if (!isObject(node)) throw new FilterError(`${path}: expected an object`);

  if ("rules" in node) {
    if (depth > MAX_FILTER_DEPTH) {
      throw new FilterError(
        `${path}: groups can nest ${MAX_FILTER_DEPTH} deep`,
      );
    }
    if (node.op !== "and" && node.op !== "or") {
      throw new FilterError(`${path}: group op must be "and" or "or"`);
    }
    if (!Array.isArray(node.rules)) {
      throw new FilterError(`${path}: rules must be a list`);
    }

    return {
      op: node.op,
      rules: node.rules.map((rule, index) =>
        parseNode(rule, depth + 1, counter, `${path}.rules[${index}]`),
      ),
    };
  }

  const field = node.field;

  if (
    typeof field !== "string" ||
    !(FILTER_FIELDS as readonly string[]).includes(field)
  ) {
    throw new FilterError(`${path}: unknown field "${String(field)}"`);
  }
  const spec = FILTER_SPEC[field as FilterField];
  const op = node.op;

  if (typeof op !== "string" || !spec.ops.includes(op as FilterOp)) {
    throw new FilterError(
      `${path}: ${spec.label} supports ${spec.ops.join(", ")}`,
    );
  }
  counter.conditions += 1;
  if (counter.conditions > MAX_FILTER_CONDITIONS) {
    throw new FilterError(
      `A filter can have at most ${MAX_FILTER_CONDITIONS} conditions`,
    );
  }
  const value = parseValue(
    field as FilterField,
    spec,
    op as FilterOp,
    node.value,
    path,
  );

  return {
    field: field as FilterField,
    op: op as FilterOp,
    ...(value === undefined ? {} : { value }),
  };
}

/** Validate untrusted input (an object or a JSON string). Throws `FilterError` (HTTP 400). */
export function parseFilter(input: unknown): Filter {
  let raw = input;

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new FilterError("Filter is not valid JSON");
    }
  }

  return parseNode(raw, 1, { conditions: 0 }, "filter");
}

/** True when the filter has no conditions anywhere, so it restricts nothing. */
export function isEmptyFilter(filter: Filter | null | undefined): boolean {
  if (!filter) return true;
  if (isGroup(filter)) return filter.rules.every(isEmptyFilter);

  return false;
}

export type CompileContext = {
  /** Who "me" is. Without it a filter that says "me" is rejected. */
  userId?: string | null;
  now?: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

type Where = Prisma.IssueWhereInput;

const COLUMN: Partial<Record<FilterField, { col: string; nullable: boolean }>> =
  {
    status: { col: "status", nullable: false },
    priority: { col: "priority", nullable: false },
    estimate: { col: "estimate", nullable: false },
    assignee: { col: "assigneeId", nullable: true },
    creator: { col: "creatorId", nullable: false },
    project: { col: "projectId", nullable: true },
    cycle: { col: "cycleId", nullable: true },
    milestone: { col: "milestoneId", nullable: true },
    parent: { col: "parentId", nullable: true },
    workflow_status: { col: "workflowStatusId", nullable: true },
  };

function resolveMe(value: string, ctx: CompileContext): string {
  if (value !== "me") return value;
  if (!ctx.userId) {
    throw new FilterError('"me" needs a signed-in user');
  }

  return ctx.userId;
}

function resolveValue(
  field: FilterField,
  value: FilterValue | undefined,
  ctx: CompileContext,
): string | string[] {
  if (Array.isArray(value)) {
    return value.map((item) =>
      FILTER_SPEC[field].kind === "person" ? resolveMe(item, ctx) : item,
    );
  }

  const text = String(value);

  return FILTER_SPEC[field].kind === "person" ? resolveMe(text, ctx) : text;
}

function scalarCondition(
  field: FilterField,
  condition: Condition,
  ctx: CompileContext,
): Where {
  const target = COLUMN[field]!;
  const { col, nullable } = target;
  const value = resolveValue(field, condition.value, ctx);

  // The cycle shortcut "active" means "whichever cycle is running now".
  if (field === "cycle" && value === "active") {
    return condition.op === "is"
      ? { cycle: { isActive: true } }
      : { OR: [{ cycleId: null }, { cycle: { isActive: false } }] };
  }

  switch (condition.op) {
    case "is":
      return { [col]: value } as Where;
    case "is_not":
      // "is not X" includes issues with no value at all.
      return (
        nullable
          ? { OR: [{ [col]: null }, { [col]: { not: value } }] }
          : { [col]: { not: value } }
      ) as Where;
    case "in":
      return { [col]: { in: value } } as Where;
    case "not_in":
      return (
        nullable
          ? { OR: [{ [col]: null }, { [col]: { notIn: value } }] }
          : { [col]: { notIn: value } }
      ) as Where;
    case "is_empty":
      return { [col]: null } as Where;
    case "is_not_empty":
      return { [col]: { not: null } } as Where;
    default:
      throw new FilterError(`${field}: unsupported operator ${condition.op}`);
  }
}

function dateCondition(
  field: FilterField,
  condition: Condition,
  ctx: CompileContext,
): Where {
  const col =
    field === "created"
      ? "createdAt"
      : field === "updated"
        ? "updatedAt"
        : field === "start"
          ? "startDate"
          : "dueDate";
  const now = ctx.now ?? new Date();
  const value = condition.value;

  switch (condition.op) {
    case "is_empty":
      return { [col]: null } as Where;
    case "is_not_empty":
      return { [col]: { not: null } } as Where;
    case "before":
      return { [col]: { lt: new Date(`${value}T00:00:00.000Z`) } } as Where;
    case "after":
      return {
        [col]: {
          gte: new Date(new Date(`${value}T00:00:00.000Z`).getTime() + DAY_MS),
        },
      } as Where;
    case "on": {
      const start = new Date(`${value}T00:00:00.000Z`);

      return {
        [col]: { gte: start, lt: new Date(start.getTime() + DAY_MS) },
      } as Where;
    }
    case "within_last":
      return {
        [col]: {
          gte: new Date(now.getTime() - Number(value) * DAY_MS),
          lte: now,
        },
      } as Where;
    case "within_next":
      return {
        [col]: {
          gte: now,
          lte: new Date(now.getTime() + Number(value) * DAY_MS),
        },
      } as Where;
    case "older_than":
      return {
        [col]: { lt: new Date(now.getTime() - Number(value) * DAY_MS) },
      } as Where;
    default:
      throw new FilterError(`${field}: unsupported operator ${condition.op}`);
  }
}

const OPEN_BLOCKER: Where = {
  relationsFrom: {
    some: {
      type: "BLOCKED_BY",
      toIssue: { status: { notIn: ["DONE", "CANCELLED"] } },
    },
  },
};

function compileCondition(condition: Condition, ctx: CompileContext): Where {
  const { field } = condition;

  switch (FILTER_SPEC[field].kind) {
    case "enum":
    case "ref":
      return scalarCondition(field, condition, ctx);
    case "person": {
      if (field === "subscriber") {
        const user = resolveValue(field, condition.value, ctx) as string;
        const subscribed: Where = { subscriptions: { some: { userId: user } } };

        return condition.op === "is" ? subscribed : { NOT: subscribed };
      }

      return scalarCondition(field, condition, ctx);
    }
    case "labels": {
      const ids = (condition.value ?? []) as string[];

      switch (condition.op) {
        case "includes_any":
          return { labels: { some: { labelId: { in: ids } } } };
        case "includes_all":
          return {
            AND: ids.map((id) => ({ labels: { some: { labelId: id } } })),
          };
        case "includes_none":
          return { NOT: { labels: { some: { labelId: { in: ids } } } } };
        case "is_empty":
          return { labels: { none: {} } };
        default:
          return { labels: { some: {} } };
      }
    }
    case "text": {
      if (field === "label_group") {
        const group: Where = {
          labels: { some: { label: { group: String(condition.value) } } },
        };

        return condition.op === "is" ? group : { NOT: group };
      }
      const match = {
        [field]: { contains: String(condition.value), mode: "insensitive" },
      } as Where;

      return condition.op === "contains" ? match : { NOT: match };
    }
    case "number": {
      const n = Number(condition.value);

      switch (condition.op) {
        case "is":
          return { number: n };
        case "is_not":
          return { number: { not: n } };
        case "gt":
          return { number: { gt: n } };
        case "gte":
          return { number: { gte: n } };
        case "lt":
          return { number: { lt: n } };
        default:
          return { number: { lte: n } };
      }
    }
    case "date":
      return dateCondition(field, condition, ctx);
    case "bool": {
      const want = condition.value === true;
      const base: Where =
        field === "blocked"
          ? OPEN_BLOCKER
          : { children: { some: { archivedAt: null } } };

      return want ? base : { NOT: base };
    }
  }
}

/** Turn a validated filter into a Prisma `where`. An empty filter gives `{}`. */
export function compileFilter(
  filter: Filter | null | undefined,
  ctx: CompileContext = {},
): Where {
  if (!filter || isEmptyFilter(filter)) return {};

  if (!isGroup(filter)) return compileCondition(filter, ctx);

  const parts = filter.rules
    .filter((rule) => !isEmptyFilter(rule))
    .map((rule) => compileFilter(rule, ctx));

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;

  return filter.op === "and" ? { AND: parts } : { OR: parts };
}

/**
 * Saved views used to store a flat object like `{ status, priority, cycleId, search }`.
 * Turn one into a filter so old views keep working with the new engine.
 */
export function legacyToFilter(
  flat: Record<string, unknown> | null | undefined,
): Filter | null {
  if (!flat || typeof flat !== "object") return null;
  const rules: Filter[] = [];
  const text = (key: string) =>
    typeof flat[key] === "string" && (flat[key] as string).trim()
      ? (flat[key] as string).trim()
      : null;

  const status = text("status");
  const priority = text("priority");

  if (status && issueStatusSchema.safeParse(status).success) {
    rules.push({ field: "status", op: "is", value: status });
  }
  if (priority && prioritySchema.safeParse(priority).success) {
    rules.push({ field: "priority", op: "is", value: priority });
  }
  for (const [key, field] of [
    ["cycleId", "cycle"],
    ["assigneeId", "assignee"],
    ["projectId", "project"],
    ["workflowStatusId", "workflow_status"],
  ] as const) {
    const value = text(key);

    if (value && ID_RE.test(value)) rules.push({ field, op: "is", value });
  }
  const group = text("labelGroup");

  if (group) rules.push({ field: "label_group", op: "is", value: group });
  const search = text("search");

  if (search) {
    const clauses: Filter[] = [
      { field: "title", op: "contains", value: search },
      { field: "description", op: "contains", value: search },
    ];

    if (/^\d+$/.test(search)) {
      clauses.push({ field: "number", op: "is", value: Number(search) });
    }
    rules.push({ op: "or", rules: clauses });
  }

  return rules.length ? { op: "and", rules } : null;
}

/** A saved view stores either a v2 filter or an old flat object. Always returns a filter or null. */
export function viewToFilter(filterJson: unknown): Filter | null {
  if (!isObject(filterJson)) return null;
  if (filterJson.version === 2) {
    try {
      return parseFilter(filterJson.filter);
    } catch {
      return null;
    }
  }

  return legacyToFilter(filterJson);
}
