/**
 * How the issue list is laid out: which field to group under headers and how to sort. Pure, so it
 * runs on the client over whatever rows are loaded (including rows added by "Load more") and
 * stays unit-testable.
 */

export const GROUP_OPTIONS = [
  "none",
  "status",
  "priority",
  "assignee",
  "project",
  "cycle",
] as const;
export const SORT_OPTIONS = [
  "manual",
  "priority",
  "newest",
  "oldest",
  "title",
] as const;

export type GroupBy = (typeof GROUP_OPTIONS)[number];
export type SortBy = (typeof SORT_OPTIONS)[number];

export const GROUP_LABELS: Record<GroupBy, string> = {
  none: "No grouping",
  status: "Status",
  priority: "Priority",
  assignee: "Assignee",
  project: "Project",
  cycle: "Cycle",
};
export const SORT_LABELS: Record<SortBy, string> = {
  manual: "Default order",
  priority: "Priority",
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title A–Z",
};

export function parseGroupBy(value: unknown): GroupBy {
  return GROUP_OPTIONS.includes(value as GroupBy) ? (value as GroupBy) : "none";
}

export function parseSortBy(value: unknown): SortBy {
  return SORT_OPTIONS.includes(value as SortBy) ? (value as SortBy) : "manual";
}

export type DisplayRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: { name: string | null; email: string } | null;
  projectId?: string | null;
  cycle?: { name: string } | null;
  createdAt?: string;
};

const PRIORITY_RANK: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};
const STATUS_RANK: Record<string, number> = {
  IN_PROGRESS: 0,
  TODO: 1,
  BACKLOG: 2,
  DONE: 3,
  CANCELLED: 4,
};

/** The group a row falls in. The empty string means "none set" (unassigned, no project...). */
export function groupKey(row: DisplayRow, groupBy: GroupBy): string {
  switch (groupBy) {
    case "status":
      return row.status;
    case "priority":
      return row.priority;
    case "assignee":
      return row.assignee ? (row.assignee.name ?? row.assignee.email) : "";
    case "project":
      return row.projectId ?? "";
    case "cycle":
      return row.cycle?.name ?? "";
    default:
      return "";
  }
}

export type DisplayGroup = {
  key: string;
  count: number;
  /** Index in `rows` where this group starts. */
  start: number;
};

export function orderForDisplay<T extends DisplayRow>(
  input: T[],
  groupBy: GroupBy,
  sortBy: SortBy,
  /** Project id → name, so project groups sort by name instead of by id. */
  projectNames: Record<string, string> = {},
): { rows: T[]; groups: DisplayGroup[] } {
  // Decorate with the original position so every comparison falls back to it: the sort is stable
  // and "Default order" leaves the server's order untouched.
  const indexed = input.map((row, index) => ({ row, index }));
  const bySort = (a: (typeof indexed)[number], b: (typeof indexed)[number]) => {
    let diff = 0;

    if (sortBy === "priority") {
      diff =
        (PRIORITY_RANK[a.row.priority] ?? 9) -
        (PRIORITY_RANK[b.row.priority] ?? 9);
    } else if (sortBy === "newest" || sortBy === "oldest") {
      const at = Date.parse(a.row.createdAt ?? "") || 0;
      const bt = Date.parse(b.row.createdAt ?? "") || 0;

      diff = sortBy === "newest" ? bt - at : at - bt;
    } else if (sortBy === "title") {
      diff = a.row.title.localeCompare(b.row.title, undefined, {
        sensitivity: "base",
      });
    }

    return diff || a.index - b.index;
  };

  if (groupBy === "none") {
    return { rows: indexed.sort(bySort).map((entry) => entry.row), groups: [] };
  }

  const buckets = new Map<string, typeof indexed>();

  for (const entry of indexed) {
    const key = groupKey(entry.row, groupBy);

    buckets.set(key, [...(buckets.get(key) ?? []), entry]);
  }
  const nameOf = (key: string) =>
    groupBy === "project" ? (projectNames[key] ?? key) : key;
  const keys = [...buckets.keys()].sort((a, b) => {
    // "Not set" always goes last.
    if (a === "" || b === "") return a === "" ? (b === "" ? 0 : 1) : -1;
    if (groupBy === "status")
      return (STATUS_RANK[a] ?? 9) - (STATUS_RANK[b] ?? 9);
    if (groupBy === "priority")
      return (PRIORITY_RANK[a] ?? 9) - (PRIORITY_RANK[b] ?? 9);

    return nameOf(a).localeCompare(nameOf(b), undefined, {
      sensitivity: "base",
    });
  });
  const rows: T[] = [];
  const groups: DisplayGroup[] = [];

  for (const key of keys) {
    const members = buckets.get(key)!.sort(bySort);

    groups.push({ key, count: members.length, start: rows.length });
    rows.push(...members.map((entry) => entry.row));
  }

  return { rows, groups };
}
