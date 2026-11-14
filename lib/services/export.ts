import { prisma } from "@/lib/db";
import {
  EXPORT_COLUMNS,
  type ExportIssue,
  isoOrEmpty,
  toCsv,
} from "@/lib/export";

/** Hard cap so one request can't pull an unbounded table into memory. */
export const EXPORT_LIMIT = 20_000;

export async function exportIssues(
  teamId: string,
  teamSlug: string,
  opts: { includeArchived?: boolean } = {},
): Promise<{ rows: ExportIssue[]; truncated: boolean }> {
  const key = teamSlug.slice(0, 3).toUpperCase();
  const issues = await prisma.issue.findMany({
    where: { teamId, ...(opts.includeArchived ? {} : { archivedAt: null }) },
    orderBy: { number: "asc" },
    take: EXPORT_LIMIT + 1,
    select: {
      number: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimate: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      startedAt: true,
      completedAt: true,
      archivedAt: true,
      assignee: { select: { name: true, email: true } },
      creator: { select: { name: true, email: true } },
      project: { select: { name: true } },
      cycle: { select: { name: true } },
      parent: { select: { number: true } },
      workflowStatus: { select: { name: true } },
      labels: { select: { label: { select: { name: true } } } },
    },
  });
  const truncated = issues.length > EXPORT_LIMIT;
  const person = (u: { name: string | null; email: string } | null) =>
    u ? (u.name ? `${u.name} <${u.email}>` : u.email) : "";

  return {
    truncated,
    rows: issues.slice(0, EXPORT_LIMIT).map((issue) => ({
      key: `${key}-${issue.number}`,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      workflowStatus: issue.workflowStatus?.name ?? "",
      priority: issue.priority,
      estimate: issue.estimate === "NONE" ? "" : issue.estimate,
      dueDate: isoOrEmpty(issue.dueDate),
      assignee: person(issue.assignee),
      creator: person(issue.creator),
      project: issue.project?.name ?? "",
      cycle: issue.cycle?.name ?? "",
      labels: issue.labels.map((l) => l.label.name).join("; "),
      parent: issue.parent ? `${key}-${issue.parent.number}` : "",
      createdAt: isoOrEmpty(issue.createdAt),
      updatedAt: isoOrEmpty(issue.updatedAt),
      startedAt: isoOrEmpty(issue.startedAt),
      completedAt: isoOrEmpty(issue.completedAt),
      archivedAt: isoOrEmpty(issue.archivedAt),
    })),
  };
}

export async function exportIssuesCsv(
  teamId: string,
  teamSlug: string,
  opts: { includeArchived?: boolean } = {},
) {
  const { rows, truncated } = await exportIssues(teamId, teamSlug, opts);

  return { csv: toCsv(rows, EXPORT_COLUMNS), count: rows.length, truncated };
}
