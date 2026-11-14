/**
 * CSV / JSON building for data export. Pure so it can be reused by the API route, the MCP tool
 * and tests.
 */

export type ExportIssue = {
  key: string;
  title: string;
  description: string;
  status: string;
  workflowStatus: string;
  priority: string;
  estimate: string;
  dueDate: string;
  assignee: string;
  creator: string;
  project: string;
  cycle: string;
  labels: string;
  parent: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string;
  completedAt: string;
  archivedAt: string;
};

export const EXPORT_COLUMNS: (keyof ExportIssue)[] = [
  "key",
  "title",
  "description",
  "status",
  "workflowStatus",
  "priority",
  "estimate",
  "dueDate",
  "assignee",
  "creator",
  "project",
  "cycle",
  "labels",
  "parent",
  "createdAt",
  "updatedAt",
  "startedAt",
  "completedAt",
  "archivedAt",
];

/**
 * One CSV cell. Quotes values that contain a comma, quote or newline. A cell that starts with
 * `=`, `+`, `-`, `@`, tab or CR is prefixed with `'` so a spreadsheet never runs it as a formula
 * (CSV injection), which matters because titles come from other people.
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;

  return text;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T & string)[],
): string {
  const lines = [columns.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }

  // Leading BOM so Excel opens it as UTF-8; CRLF line endings per RFC 4180.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function isoOrEmpty(date: Date | null | undefined): string {
  return date ? date.toISOString() : "";
}
