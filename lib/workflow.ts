/** Pure helpers for team workflow statuses (the columns an issue can be in). */
import type {
  IssueStatus,
  WorkflowStatusType,
} from "@/lib/generated/prisma/client";

export const STATUS_TO_TYPE: Record<IssueStatus, WorkflowStatusType> = {
  BACKLOG: "backlog",
  TODO: "unstarted",
  IN_PROGRESS: "started",
  DONE: "completed",
  CANCELLED: "canceled",
};

export const TYPE_TO_STATUS: Record<WorkflowStatusType, IssueStatus> = {
  backlog: "BACKLOG",
  unstarted: "TODO",
  started: "IN_PROGRESS",
  completed: "DONE",
  canceled: "CANCELLED",
};

export const TYPE_LABELS: Record<WorkflowStatusType, string> = {
  backlog: "Backlog",
  unstarted: "Unstarted",
  started: "Started",
  completed: "Completed",
  canceled: "Canceled",
};

export const WORKFLOW_TYPES = [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
] as const satisfies readonly WorkflowStatusType[];

export const MAX_WORKFLOW_STATUSES = 30;

export type StatusRow = {
  id: string;
  key: string;
  name: string;
  type: WorkflowStatusType;
  position: number;
};

/** The status new issues of `type` land in: the first one of that type, by position. */
export function defaultForType<T extends StatusRow>(
  rows: T[],
  type: WorkflowStatusType,
): T | undefined {
  return rows
    .filter((row) => row.type === type)
    .sort((a, b) => a.position - b.position)[0];
}

/** A key like `in_review` from a display name. Always lower-case letters, digits, underscore. */
export function slugifyKey(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return slug || "status";
}

/** `base`, or `base_2`, `base_3`... the first one not in `taken`. */
export function uniqueKey(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);

  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base.slice(0, 36)}_${n}`;

    if (!used.has(candidate)) return candidate;
  }

  return `${base.slice(0, 30)}_${Date.now()}`;
}

/** Why `id` cannot be deleted, or null when it can. Every type must keep at least one status. */
export function deletionBlocker(rows: StatusRow[], id: string): string | null {
  const target = rows.find((row) => row.id === id);

  if (!target) return "Status not found";
  const sameType = rows.filter((row) => row.type === target.type);

  if (sameType.length <= 1) {
    return `A team needs at least one ${TYPE_LABELS[target.type].toLowerCase()} status`;
  }

  return null;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isValidColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** Case-insensitive name clash with another status? */
export function nameTaken(
  rows: StatusRow[],
  name: string,
  exceptId?: string,
): boolean {
  const wanted = name.trim().toLowerCase();

  return rows.some(
    (row) => row.id !== exceptId && row.name.trim().toLowerCase() === wanted,
  );
}
