/**
 * Pure helpers the filter builder UI uses to edit a filter tree. Nothing here touches React,
 * so the rules (what a new row looks like, what happens to the value when the operator
 * changes) are unit-tested. Every function returns a new tree and never mutates its input.
 */
import {
  FILTER_FIELDS,
  FILTER_SPEC,
  type Condition,
  type Filter,
  type FilterField,
  type FilterOp,
  type FilterValue,
  type Group,
  isGroup,
  MAX_FILTER_CONDITIONS,
  MAX_FILTER_DEPTH,
} from "@/lib/issue-filter";

/** A path into the tree: the index of the child to follow at each level. [] is the root. */
export type Path = number[];

export const EMPTY_FILTER: Group = { op: "and", rules: [] };

const MULTI_OPS: readonly FilterOp[] = [
  "in",
  "not_in",
  "includes_any",
  "includes_all",
  "includes_none",
];
const NO_VALUE_OPS: readonly FilterOp[] = ["is_empty", "is_not_empty"];
const DAY_OPS: readonly FilterOp[] = [
  "within_last",
  "within_next",
  "older_than",
];
const DATE_OPS: readonly FilterOp[] = ["before", "after", "on"];

export function isMultiOp(op: FilterOp) {
  return MULTI_OPS.includes(op);
}
export function isNoValueOp(op: FilterOp) {
  return NO_VALUE_OPS.includes(op);
}
export function isDayCountOp(op: FilterOp) {
  return DAY_OPS.includes(op);
}
export function isDateOp(op: FilterOp) {
  return DATE_OPS.includes(op);
}

const today = () => new Date().toISOString().slice(0, 10);

/** A sensible empty value for `op` on `field`, or undefined when the operator takes none. */
export function emptyValue(
  field: FilterField,
  op: FilterOp,
): FilterValue | undefined {
  const spec = FILTER_SPEC[field];

  if (isNoValueOp(op)) return undefined;
  if (isMultiOp(op)) {
    return spec.kind === "enum" && spec.options?.[0] ? [spec.options[0]] : [];
  }
  if (isDayCountOp(op)) return 7;
  if (isDateOp(op)) return today();
  switch (spec.kind) {
    case "enum":
      return spec.options?.[0] ?? "";
    case "person":
      return "me";
    case "number":
      return 1;
    case "bool":
      return true;
    default:
      return "";
  }
}

/** A new condition row for `field`, using the field's first operator. */
export function defaultCondition(field: FilterField): Condition {
  const op = FILTER_SPEC[field].ops[0]!;
  const value = emptyValue(field, op);

  return { field, op, ...(value === undefined ? {} : { value }) };
}

/** Change a row's field. The operator and value reset because they rarely carry over. */
export function withField(_: Condition, field: FilterField): Condition {
  return defaultCondition(field);
}

/**
 * Change a row's operator, keeping the value when it still fits. Going between a single and
 * a list operator wraps or unwraps the value; going to or from a date or day-count operator
 * resets it.
 */
export function withOp(condition: Condition, op: FilterOp): Condition {
  const { field } = condition;

  if (!FILTER_SPEC[field].ops.includes(op)) return condition;
  if (isNoValueOp(op)) return { field, op };

  const current = condition.value;
  const wasMulti = isMultiOp(condition.op);
  const nowMulti = isMultiOp(op);
  const sameShape =
    isDayCountOp(condition.op) === isDayCountOp(op) &&
    isDateOp(condition.op) === isDateOp(op) &&
    !isNoValueOp(condition.op);

  if (!sameShape || current === undefined) {
    return { field, op, value: emptyValue(field, op) };
  }
  if (wasMulti === nowMulti) return { field, op, value: current };
  if (nowMulti) {
    return {
      field,
      op,
      value: Array.isArray(current)
        ? current
        : current === ""
          ? []
          : [String(current)],
    };
  }

  return {
    field,
    op,
    value: Array.isArray(current)
      ? (current[0] ?? emptyValue(field, op))
      : current,
  } as Condition;
}

function childAt(group: Group, index: number): Filter | undefined {
  return group.rules[index];
}

function nodeAt(root: Filter, path: Path): Filter | undefined {
  let node: Filter | undefined = root;

  for (const index of path) {
    if (!node || !isGroup(node)) return undefined;
    node = childAt(node, index);
  }

  return node;
}

function replaceAt(root: Filter, path: Path, next: Filter | null): Filter {
  if (path.length === 0) return next ?? EMPTY_FILTER;
  if (!isGroup(root)) return root;
  const [head, ...rest] = path as [number, ...number[]];
  const rules = root.rules.flatMap((rule, index) => {
    if (index !== head) return [rule];
    if (rest.length === 0) return next ? [next] : [];

    return [replaceAt(rule, rest, next)];
  });

  return { ...root, rules };
}

export function countConditions(filter: Filter): number {
  return isGroup(filter)
    ? filter.rules.reduce((total, rule) => total + countConditions(rule), 0)
    : 1;
}

/** How many groups deep `path` sits. The root group is depth 1. */
function depthOf(root: Filter, path: Path): number {
  let depth = 1;
  let node: Filter | undefined = root;

  for (const index of path) {
    if (!node || !isGroup(node)) break;
    node = childAt(node, index);
    if (node && isGroup(node)) depth += 1;
  }

  return depth;
}

/** Add a condition row to the group at `path`. Ignored once the condition limit is reached. */
export function addCondition(
  root: Filter,
  path: Path,
  field: FilterField = "status",
): Filter {
  const group = nodeAt(root, path);

  if (!group || !isGroup(group)) return root;
  if (countConditions(root) >= MAX_FILTER_CONDITIONS) return root;

  return replaceAt(root, path, {
    ...group,
    rules: [...group.rules, defaultCondition(field)],
  });
}

/** Add a nested group (with one starter row) to the group at `path`, within the depth limit. */
export function addGroup(root: Filter, path: Path): Filter {
  const group = nodeAt(root, path);

  if (!group || !isGroup(group)) return root;
  if (depthOf(root, path) >= MAX_FILTER_DEPTH) return root;
  if (countConditions(root) >= MAX_FILTER_CONDITIONS) return root;

  return replaceAt(root, path, {
    ...group,
    rules: [
      ...group.rules,
      {
        op: group.op === "and" ? "or" : "and",
        rules: [defaultCondition("status")],
      },
    ],
  });
}

export function updateNode(root: Filter, path: Path, next: Filter): Filter {
  return replaceAt(root, path, next);
}

/** Remove the row or group at `path`. Removing the root clears the whole filter. */
export function removeNode(root: Filter, path: Path): Filter {
  return replaceAt(root, path, null);
}

/** Flip a group between AND and OR. */
export function toggleGroupOp(root: Filter, path: Path): Filter {
  const group = nodeAt(root, path);

  if (!group || !isGroup(group)) return root;

  return replaceAt(root, path, {
    ...group,
    op: group.op === "and" ? "or" : "and",
  });
}

/** Drop empty groups and rows with an unfinished value, so what is saved always parses. */
export function cleanFilter(filter: Filter): Filter | null {
  if (isGroup(filter)) {
    const rules = filter.rules
      .map(cleanFilter)
      .filter((rule): rule is Filter => rule !== null);

    return rules.length ? { ...filter, rules } : null;
  }
  if (isNoValueOp(filter.op)) return { field: filter.field, op: filter.op };
  const { value } = filter;

  if (value === undefined || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;
  if (typeof value === "number" && Number.isNaN(value)) return null;

  return filter;
}

/** A readable one-line summary, used for a view's subtitle and the active-filter chip. */
export function describeFilter(filter: Filter | null | undefined): string {
  if (!filter) return "";
  if (isGroup(filter)) {
    const parts = filter.rules.map(describeFilter).filter(Boolean);

    if (!parts.length) return "";
    const joined = parts.join(filter.op === "and" ? " and " : " or ");

    return parts.length > 1 ? `(${joined})` : joined;
  }
  const spec = FILTER_SPEC[filter.field];
  const op = filter.op.replaceAll("_", " ");
  const value = Array.isArray(filter.value)
    ? filter.value.join(", ")
    : filter.value === undefined
      ? ""
      : String(filter.value);

  return `${spec.label.toLowerCase()} ${op}${value ? ` ${value}` : ""}`;
}

/** Fields shown in the builder's "add filter" menu. `parent` needs an id picker, so it is API-only. */
export const BUILDER_FIELDS: readonly FilterField[] = FILTER_FIELDS.filter(
  (field) => field !== "parent",
);
