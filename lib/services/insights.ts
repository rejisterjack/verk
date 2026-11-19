import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/db";
import { compileFilter, parseFilter } from "@/lib/issue-filter";
import {
  aggregate,
  type DimensionId,
  type InsightRow,
  type MeasureId,
  total,
} from "@/lib/insights";
import { readableIssueScope } from "@/lib/services/guest-scope";

/** Hard cap so a huge team can't turn one chart into a table scan of everything. */
export const INSIGHT_ROW_LIMIT = 20_000;

/**
 * Run an insights query: fetch the issues matching `filter` (a saved-view style filter tree,
 * optional), then group and measure them. A limited guest only ever sees their projects.
 */
export async function runInsight(
  teamId: string,
  userId: string | null | undefined,
  query: {
    measure: MeasureId;
    dimension: DimensionId;
    filter?: unknown;
    includeArchived?: boolean;
  },
) {
  const and: Prisma.IssueWhereInput[] = [];
  const scope = await readableIssueScope(teamId, userId);

  if (scope) and.push(scope);
  if (
    query.filter !== undefined &&
    query.filter !== null &&
    query.filter !== ""
  ) {
    const { parseIssueQuery } = await import("@/lib/issue-query");
    const compiled = compileFilter(
      typeof query.filter === "string"
        ? parseIssueQuery(query.filter)
        : parseFilter(query.filter),
      { userId },
    );

    if (Object.keys(compiled).length) and.push(compiled);
  }
  const rows = await prisma.issue.findMany({
    where: {
      teamId,
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...(and.length ? { AND: and } : {}),
    },
    select: {
      status: true,
      priority: true,
      estimate: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      assignee: { select: { name: true, email: true } },
      project: { select: { name: true } },
      cycle: { select: { name: true } },
      labels: { select: { label: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: INSIGHT_ROW_LIMIT + 1,
  });
  const truncated = rows.length > INSIGHT_ROW_LIMIT;
  const mapped: InsightRow[] = rows.slice(0, INSIGHT_ROW_LIMIT).map((row) => ({
    status: row.status,
    priority: row.priority,
    estimate: row.estimate,
    assignee: row.assignee ? (row.assignee.name ?? row.assignee.email) : null,
    project: row.project?.name ?? null,
    cycle: row.cycle?.name ?? null,
    labels: row.labels.map((entry) => entry.label.name),
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  }));

  return {
    buckets: aggregate(mapped, query.measure, query.dimension),
    total: total(mapped, query.measure),
    rows: mapped.length,
    truncated,
  };
}
