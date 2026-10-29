import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

export type LinearCsvRow = {
  title: string;
  description: string;
  status: IssueStatus;
  priority: Priority;
  assigneeEmail?: string;
  labels?: string[];
  projectName?: string;
};

const STATUS_MAP: Record<string, IssueStatus> = {
  backlog: "BACKLOG",
  todo: "TODO",
  "to do": "TODO",
  "in progress": "IN_PROGRESS",
  started: "IN_PROGRESS",
  done: "DONE",
  completed: "DONE",
  canceled: "CANCELLED",
  cancelled: "CANCELLED",
  triage: "BACKLOG",
};

const PRIORITY_MAP: Record<string, Priority> = {
  urgent: "URGENT",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  "no priority": "NONE",
  none: "NONE",
  "": "NONE",
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);

  return cells.map((c) => c.trim());
}

function headerIndex(headers: string[], names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());

  for (const name of names) {
    const idx = lower.indexOf(name);

    if (idx >= 0) return idx;
  }

  return -1;
}

/** Parse Linear CSV export into Verk issue rows. */
export function parseLinearCsv(text: string): LinearCsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]!);
  const titleIdx = headerIndex(headers, ["title", "issue title"]);
  const descIdx = headerIndex(headers, ["description", "content"]);
  const statusIdx = headerIndex(headers, ["status", "state"]);
  const priorityIdx = headerIndex(headers, ["priority"]);
  const assigneeIdx = headerIndex(headers, [
    "assignee",
    "assignee email",
    "email",
  ]);
  const labelsIdx = headerIndex(headers, ["labels", "label"]);
  const projectIdx = headerIndex(headers, ["project", "project name"]);

  if (titleIdx < 0) {
    throw new Error("CSV must include a Title column");
  }

  const rows: LinearCsvRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const title = cells[titleIdx]?.trim();

    if (!title) continue;

    const statusRaw =
      (statusIdx >= 0 ? cells[statusIdx] : "Backlog") ?? "Backlog";
    const priorityRaw =
      (priorityIdx >= 0 ? cells[priorityIdx] : "No priority") ?? "No priority";

    rows.push({
      title: title.slice(0, 200),
      description: descIdx >= 0 ? (cells[descIdx] ?? "") : "",
      status: STATUS_MAP[statusRaw.toLowerCase()] ?? "BACKLOG",
      priority: PRIORITY_MAP[priorityRaw.toLowerCase()] ?? "NONE",
      assigneeEmail:
        assigneeIdx >= 0 && cells[assigneeIdx]
          ? cells[assigneeIdx]!.toLowerCase()
          : undefined,
      labels:
        labelsIdx >= 0 && cells[labelsIdx]
          ? cells[labelsIdx]!
              .split(",")
              .map((name) => name.trim())
              .filter(Boolean)
          : undefined,
      projectName:
        projectIdx >= 0 && cells[projectIdx]?.trim()
          ? cells[projectIdx]!.trim()
          : undefined,
    });
  }

  return rows;
}
