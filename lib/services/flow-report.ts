import { prisma } from "@/lib/db";
import { cumulativeFlow, cycleTimeDays, dayKeys, type FlowStatus } from "@/lib/flow";
import { readableIssueScope } from "@/lib/services/guest-scope";

export async function flowReport(teamId: string, userId?: string | null) {
  const scope = await readableIssueScope(teamId, userId);
  const issues = await prisma.issue.findMany({
    where: {
      teamId,
      archivedAt: null,
      ...(scope ? { AND: [scope] } : {}),
    },
    select: {
      createdAt: true,
      status: true,
      startedAt: true,
      completedAt: true,
      activities: {
        where: { field: "status" },
        select: { createdAt: true, toValue: true },
        orderBy: { createdAt: "asc" },
      },
    },
    take: 1000,
  });
  const todayUtc = new Date();
  const windowStart = new Date(
    Date.UTC(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth(),
      todayUtc.getUTCDate() - 13,
    ),
  );
  const days = dayKeys(windowStart, 14);
  const flow = cumulativeFlow(
    issues.map((issue) => ({
      createdAt: issue.createdAt,
      status: issue.status as FlowStatus,
      changes: issue.activities.flatMap((activity) =>
        activity.toValue
          ? [{ at: activity.createdAt, status: activity.toValue as FlowStatus }]
          : [],
      ),
    })),
    days,
  );

  return {
    flow,
    cycleTimes: cycleTimeDays(issues),
  };
}
