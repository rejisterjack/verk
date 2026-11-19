import { prisma } from "@/lib/db";
import {
  burndown,
  type CycleIssueRow,
  daysBetween,
  scopeChange,
  startOfUtcDay,
  velocity,
} from "@/lib/cycle-stats";
import { estimatePoints } from "@/lib/estimate-points";
import { AuthError } from "@/lib/errors";

const issueSelect = {
  estimate: true,
  status: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
  canceledAt: true,
} as const;

function toRow(row: {
  estimate: string;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  canceledAt: Date | null;
}): CycleIssueRow {
  return row;
}

/** Burndown, scope change and per-assignee split for one cycle. */
export async function cycleAnalytics(
  teamId: string,
  cycleId: string,
  opts: { now?: Date } = {},
) {
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, teamId },
    select: { id: true, name: true, startDate: true, endDate: true },
  });

  if (!cycle) throw new AuthError("Cycle not found", "NOT_FOUND", 404);

  const issues = await prisma.issue.findMany({
    where: { teamId, cycleId, archivedAt: null },
    select: {
      ...issueSelect,
      assignee: { select: { id: true, name: true, email: true } },
    },
  });
  const rows = issues.map(toRow);
  const now = opts.now ?? new Date();

  // Per-assignee split: how much each person was given and how much they finished.
  const byPerson = new Map<
    string,
    { name: string; assigned: number; done: number; issues: number }
  >();

  for (const issue of issues) {
    if (issue.canceledAt) continue;
    const key = issue.assignee?.id ?? "none";
    const entry = byPerson.get(key) ?? {
      name: issue.assignee?.name ?? issue.assignee?.email ?? "Unassigned",
      assigned: 0,
      done: 0,
      issues: 0,
    };
    const points = estimatePoints(issue.estimate);

    entry.assigned += points;
    entry.issues += 1;
    if (issue.completedAt) entry.done += points;
    byPerson.set(key, entry);
  }

  return {
    cycle,
    points: burndown(rows, cycle, { unit: "points", now }),
    issueCount: burndown(rows, cycle, { unit: "issues", now }),
    scope: scopeChange(rows, cycle, "points"),
    people: [...byPerson.values()].sort((a, b) => b.assigned - a.assigned),
    totals: {
      issues: rows.filter((row) => !row.canceledAt).length,
      done: rows.filter((row) => row.completedAt && !row.canceledAt).length,
    },
  };
}

/** Planned vs completed points over the team's recent cycles, plus the average velocity. */
export async function teamVelocity(
  teamId: string,
  opts: { last?: number; now?: Date } = {},
) {
  const cycles = await prisma.cycle.findMany({
    where: { teamId },
    orderBy: { endDate: "desc" },
    take: opts.last ?? 6,
    select: {
      name: true,
      endDate: true,
      issues: { where: { archivedAt: null }, select: issueSelect },
    },
  });

  return velocity(
    cycles.map((cycle) => ({
      name: cycle.name,
      endDate: cycle.endDate,
      issues: cycle.issues.map(toRow),
    })),
    { last: opts.last ?? 6, now: opts.now },
  );
}

/**
 * Write today's snapshot for every active cycle. Run daily by the cron, so a burndown keeps
 * its shape even if issues are edited or moved later. Re-running the same day just updates it.
 */
export async function snapshotActiveCycles(now = new Date()) {
  const day = startOfUtcDay(now);
  const cycles = await prisma.cycle.findMany({
    where: {
      startDate: { lte: now },
      endDate: { gte: new Date(day.getTime() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });

  for (const cycle of cycles) {
    const issues = await prisma.issue.findMany({
      where: { cycleId: cycle.id, archivedAt: null, canceledAt: null },
      select: { estimate: true, startedAt: true, completedAt: true },
    });
    const data = {
      scopePoints: issues.reduce(
        (sum, i) => sum + estimatePoints(i.estimate),
        0,
      ),
      scopeIssues: issues.length,
      donePoints: issues
        .filter((i) => i.completedAt)
        .reduce((sum, i) => sum + estimatePoints(i.estimate), 0),
      doneIssues: issues.filter((i) => i.completedAt).length,
      startedIssues: issues.filter((i) => i.startedAt && !i.completedAt).length,
    };

    await prisma.cycleSnapshot.upsert({
      where: { cycleId_day: { cycleId: cycle.id, day } },
      create: { cycleId: cycle.id, day, ...data },
      update: data,
    });
  }

  return cycles.length;
}

export { daysBetween };
