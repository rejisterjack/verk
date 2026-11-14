/**
 * A generic CSV importer: a real RFC 4180 parser (quoted cells may contain commas, quotes and
 * newlines), a column mapping, and presets that guess the mapping for exports from Jira, GitHub
 * and Asana. Pure, so it can power a preview before anything is written.
 */

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  return rows;
}

export const FIELDS = [
  { id: "title", label: "Title", required: true },
  { id: "description", label: "Description" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "assignee", label: "Assignee (email)" },
  { id: "labels", label: "Labels (comma or semicolon separated)" },
  { id: "project", label: "Project" },
  { id: "dueDate", label: "Due date" },
] as const;

export type FieldId = (typeof FIELDS)[number]["id"];
/** Field id to the zero-based column index it reads from (-1 or missing = not mapped). */
export type Mapping = Partial<Record<FieldId, number>>;

const GUESSES: Record<FieldId, string[]> = {
  title: ["title", "summary", "name", "task name", "issue title", "subject"],
  description: ["description", "body", "details", "notes", "issue description"],
  status: ["status", "state", "issue status", "section/column"],
  priority: ["priority", "severity"],
  assignee: ["assignee", "assignee email", "assigned to", "owner"],
  labels: ["labels", "label", "tags", "components"],
  project: ["project", "project name", "projects", "epic link", "epic name"],
  dueDate: ["due date", "due", "duedate", "due on"],
};

/** Best-guess column mapping from the header row. Nothing is mapped twice. */
export function guessMapping(headers: string[]): Mapping {
  const lower = headers.map((header) => header.trim().toLowerCase());
  const used = new Set<number>();
  const mapping: Mapping = {};

  for (const field of FIELDS) {
    for (const name of GUESSES[field.id]) {
      const index = lower.findIndex((h, i) => h === name && !used.has(i));

      if (index >= 0) {
        mapping[field.id] = index;
        used.add(index);
        break;
      }
    }
  }

  return mapping;
}

/** Which tool a header row looks like, for a friendlier preview. */
export function detectSource(
  headers: string[],
): "jira" | "github" | "asana" | "generic" {
  const lower = new Set(headers.map((h) => h.trim().toLowerCase()));

  if (lower.has("issue key") || lower.has("issue id") || lower.has("epic link"))
    return "jira";
  if (lower.has("task id") || lower.has("section/column")) return "asana";
  if (lower.has("labels") && lower.has("state") && lower.has("number"))
    return "github";

  return "generic";
}

const STATUS_WORDS: [RegExp, IssueStatus][] = [
  [
    /^(backlog|new|open|icebox|triage|to be (done|triaged)|untriaged)$/,
    "BACKLOG",
  ],
  [/^(todo|to do|ready|selected for development|planned|not started)$/, "TODO"],
  [
    /^(in progress|doing|started|in review|review|in development|active|working)$/,
    "IN_PROGRESS",
  ],
  [/^(done|closed|resolved|complete|completed|shipped|fixed|merged)$/, "DONE"],
  [
    /^(cancel+ed|won'?t do|wontfix|duplicate|rejected|invalid|abandoned)$/,
    "CANCELLED",
  ],
];

export function mapStatus(raw: string): IssueStatus {
  const value = raw.trim().toLowerCase();

  for (const [pattern, status] of STATUS_WORDS) {
    if (pattern.test(value)) return status;
  }

  return "BACKLOG";
}

export function mapPriority(raw: string): Priority {
  const value = raw.trim().toLowerCase();

  if (/^(urgent|critical|blocker|highest|p0|1)$/.test(value)) return "URGENT";
  if (/^(high|major|p1|2)$/.test(value)) return "HIGH";
  if (/^(medium|normal|moderate|p2|3)$/.test(value)) return "MEDIUM";
  if (/^(low|minor|lowest|trivial|p3|4)$/.test(value)) return "LOW";

  return "NONE";
}

/** `2026-03-04`, `03/04/2026` (read as US month/day) or an ISO timestamp; otherwise null. */
export function parseDueDate(raw: string): string | null {
  const value = raw.trim();

  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const parts = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : us
      ? [Number(us[3]), Number(us[1]), Number(us[2])]
      : null;

  if (!parts) return null;
  const [year, month, day] = parts as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

export type ImportRow = {
  line: number;
  title: string;
  description: string;
  status: IssueStatus;
  priority: Priority;
  assigneeEmail: string | null;
  labels: string[];
  project: string | null;
  dueDate: string | null;
};

export type RowProblem = { line: number; message: string };

export function applyMapping(
  rows: string[][],
  mapping: Mapping,
): { rows: ImportRow[]; problems: RowProblem[]; truncated: boolean } {
  const out: ImportRow[] = [];
  const problems: RowProblem[] = [];
  const body = rows.slice(1);
  const cell = (row: string[], field: FieldId) => {
    const index = mapping[field];

    return index === undefined || index < 0 ? "" : (row[index] ?? "").trim();
  };

  body.slice(0, MAX_IMPORT_ROWS).forEach((row, i) => {
    const line = i + 2; // spreadsheet line numbers: the header is line 1
    const title = cell(row, "title");

    if (!title) {
      problems.push({ line, message: "Missing title, skipped" });

      return;
    }
    const dueRaw = cell(row, "dueDate");
    const dueDate = parseDueDate(dueRaw);

    if (dueRaw && !dueDate) {
      problems.push({
        line,
        message: `Unreadable due date "${dueRaw}", left empty`,
      });
    }
    const assignee = cell(row, "assignee").toLowerCase();

    out.push({
      line,
      title: title.slice(0, 200),
      description: cell(row, "description").slice(0, 20000),
      status: mapStatus(cell(row, "status")),
      priority: mapPriority(cell(row, "priority")),
      assigneeEmail: /^\S+@\S+\.\S+$/.test(assignee) ? assignee : null,
      labels: cell(row, "labels")
        .split(/[;,]/)
        .map((label) => label.trim())
        .filter(Boolean)
        .slice(0, 10),
      project: cell(row, "project") || null,
      dueDate,
    });
  });

  return { rows: out, problems, truncated: body.length > MAX_IMPORT_ROWS };
}
