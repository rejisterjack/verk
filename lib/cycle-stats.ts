/**
 * Cycle analytics, as pure functions over plain rows: burndown, velocity and scope creep.
 * Dates are compared as UTC calendar days so a chart looks the same on every server.
 */
import { estimatePoints } from "@/lib/estimate-points";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CycleIssueRow = {
  estimate: string | null;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  canceledAt: Date | null;
  /** When the issue joined the cycle, if known. Falls back to `createdAt`. */
  addedToCycleAt?: Date | null;
};

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Every UTC day from `start` to `end`, inclusive. Capped so a bad date range cannot explode. */
export function daysBetween(start: Date, end: Date, cap = 120): Date[] {
  const first = startOfUtcDay(start).getTime();
  const last = startOfUtcDay(end).getTime();
  const days: Date[] = [];

  for (let t = first; t <= last && days.length < cap; t += DAY_MS) {
    days.push(new Date(t));
  }

  return days;
}

export type BurnPoint = {
  day: string; // YYYY-MM-DD
  scope: number; // points that were in the cycle by the end of this day
  done: number; // points finished by the end of this day
  remaining: number;
  ideal: number; // straight line from the starting scope down to 0
  future: boolean; // after today: not real data yet
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Daily burndown. `unit` picks story points or issue count. An issue counts as scope from the
 * day it joined the cycle, and as done from the day it completed. Cancelled issues leave the
 * scope from the day they were cancelled, so they do not look like unfinished work.
 */
export function burndown(
  issues: CycleIssueRow[],
  cycle: { startDate: Date; endDate: Date },
  opts: { unit?: "points" | "issues"; now?: Date } = {},
): BurnPoint[] {
  const unit = opts.unit ?? "points";
  const now = opts.now ?? new Date();
  const days = daysBetween(cycle.startDate, cycle.endDate);
  const today = startOfUtcDay(now).getTime();
  const weight = (row: CycleIssueRow) =>
    unit === "points" ? estimatePoints(row.estimate) : 1;
  const dayEnd = (day: Date) => day.getTime() + DAY_MS;
  const joined = (row: CycleIssueRow) =>
    (row.addedToCycleAt ?? row.createdAt).getTime();

  // Scope on the first day is the baseline the ideal line starts from.
  const startScope = issues
    .filter((row) => joined(row) < dayEnd(days[0] ?? cycle.startDate))
    .reduce((sum, row) => sum + weight(row), 0);
  const span = Math.max(1, days.length - 1);

  return days.map((day, index) => {
    const end = dayEnd(day);
    let scope = 0;
    let done = 0;

    for (const row of issues) {
      if (joined(row) >= end) continue;
      if (row.canceledAt && row.canceledAt.getTime() < end) continue;
      scope += weight(row);
      if (row.completedAt && row.completedAt.getTime() < end) {
        done += weight(row);
      }
    }
    const future = day.getTime() > today;

    return {
      day: iso(day),
      scope,
      done,
      remaining: scope - done,
      ideal: Math.max(0, Math.round(startScope * (1 - index / span))),
      future,
    };
  });
}

export type ScopeChange = {
  added: number;
  removed: number;
  creepPercent: number;
};

/**
 * Work added after the cycle started, and work cancelled or dropped. `creepPercent` is the
 * added scope as a share of the scope the cycle began with.
 */
export function scopeChange(
  issues: CycleIssueRow[],
  cycle: { startDate: Date },
  unit: "points" | "issues" = "points",
): ScopeChange {
  const start = startOfUtcDay(cycle.startDate).getTime() + DAY_MS;
  const weight = (row: CycleIssueRow) =>
    unit === "points" ? estimatePoints(row.estimate) : 1;
  let base = 0;
  let added = 0;
  let removed = 0;

  for (const row of issues) {
    const at = (row.addedToCycleAt ?? row.createdAt).getTime();

    if (at < start) base += weight(row);
    else added += weight(row);
    if (row.canceledAt) removed += weight(row);
  }

  return {
    added,
    removed,
    creepPercent:
      base > 0 ? Math.round((added / base) * 100) : added > 0 ? 100 : 0,
  };
}

export type VelocityPoint = {
  name: string;
  planned: number;
  completed: number;
};

/**
 * Points planned and completed in each of the last cycles, oldest first, plus the average
 * completed per cycle. Only finished cycles feed the average, since an open cycle is not done.
 */
export function velocity(
  cycles: {
    name: string;
    endDate: Date;
    issues: CycleIssueRow[];
  }[],
  opts: { unit?: "points" | "issues"; now?: Date; last?: number } = {},
): { points: VelocityPoint[]; average: number } {
  const unit = opts.unit ?? "points";
  const now = opts.now ?? new Date();
  const last = opts.last ?? 6;
  const weight = (row: CycleIssueRow) =>
    unit === "points" ? estimatePoints(row.estimate) : 1;
  const sorted = [...cycles]
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .slice(-last);
  const points = sorted.map((cycle) => {
    const live = cycle.issues.filter((row) => !row.canceledAt);

    return {
      name: cycle.name,
      planned: live.reduce((sum, row) => sum + weight(row), 0),
      completed: live
        .filter((row) => row.completedAt)
        .reduce((sum, row) => sum + weight(row), 0),
    };
  });
  const finished = sorted
    .map((cycle, index) => ({ cycle, point: points[index]! }))
    .filter(({ cycle }) => cycle.endDate.getTime() < now.getTime());
  const average = finished.length
    ? Math.round(
        finished.reduce((sum, { point }) => sum + point.completed, 0) /
          finished.length,
      )
    : 0;

  return { points, average };
}

/** The status transition that must stamp a timestamp, or null when nothing changes. */
export function lifecycleStamps(
  from: string,
  to: string,
  existing: {
    startedAt: Date | null;
    completedAt: Date | null;
    canceledAt: Date | null;
  },
  now: Date,
): {
  startedAt?: Date | null;
  completedAt?: Date | null;
  canceledAt?: Date | null;
} {
  if (from === to) return {};
  const patch: {
    startedAt?: Date | null;
    completedAt?: Date | null;
    canceledAt?: Date | null;
  } = {};

  // Leaving a finished state clears its stamp, so reopening an issue un-burns it.
  if (from === "DONE") patch.completedAt = null;
  if (from === "CANCELLED") patch.canceledAt = null;

  if (to === "IN_PROGRESS" && !existing.startedAt) patch.startedAt = now;
  if (to === "DONE") {
    patch.completedAt = now;
    if (!existing.startedAt) patch.startedAt = now;
  }
  if (to === "CANCELLED") patch.canceledAt = now;

  return patch;
}
