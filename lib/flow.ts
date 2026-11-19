export type FlowStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELLED";

export const FLOW_STATUSES: FlowStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

export type StatusChange = {
  at: Date;
  status: FlowStatus;
};

export type FlowIssue = {
  createdAt: Date;
  status: FlowStatus;
  changes: StatusChange[];
};

export type FlowDay = {
  day: string;
  counts: Record<FlowStatus, number>;
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function statusOn(issue: FlowIssue, end: Date): FlowStatus {
  let status = issue.status;
  let latest = -1;

  for (const change of issue.changes) {
    const time = change.at.getTime();

    if (time <= end.getTime() && time >= latest) {
      latest = time;
      status = change.status;
    }
  }
  if (!issue.changes.length) return issue.status;
  const first = [...issue.changes].sort((a, b) => a.at.getTime() - b.at.getTime())[0];

  if (first && end.getTime() < first.at.getTime()) {
    return "BACKLOG";
  }

  return status;
}

/** Daily counts of issues in each status. `changes` are status transitions; the current status is the fallback. */
export function cumulativeFlow(issues: FlowIssue[], days: string[]): FlowDay[] {
  return days.map((day) => {
    const end = new Date(`${day}T23:59:59.999Z`);
    const counts = Object.fromEntries(
      FLOW_STATUSES.map((status) => [status, 0]),
    ) as Record<FlowStatus, number>;

    for (const issue of issues) {
      if (issue.createdAt.getTime() > end.getTime()) continue;
      counts[statusOn(issue, end)] += 1;
    }

    return { day, counts };
  });
}

/** Whole days from start to completion. Issues without both timestamps are skipped. */
export function cycleTimeDays(
  issues: { startedAt: Date | null; completedAt: Date | null }[],
) {
  return issues.flatMap((issue) => {
    if (!issue.startedAt || !issue.completedAt) return [];
    const days = Math.max(
      0,
      Math.round(
        (issue.completedAt.getTime() - issue.startedAt.getTime()) / 86_400_000,
      ),
    );

    return [days];
  });
}

export function dayKeys(from: Date, count: number) {
  const keys: string[] = [];

  for (let i = 0; i < count; i++) {
    const day = new Date(from.getTime() + i * 86_400_000);

    keys.push(dayKey(day));
  }

  return keys;
}
