import { prisma } from "@/lib/db";
import { cumulativeFlow, cycleTimeDays, dayKeys, type FlowStatus } from "@/lib/flow";
import { readableIssueScope } from "@/lib/services/guest-scope";

export async function flowReport(teamId: string, userId?: string | null) {
  const scope = await readableIssueScope(teamId, userId);
  const since = new Date(Date.now() - 28 * 86_400_000);
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
  const days = dayKeys(since, 28);
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
    flow: flow.slice(-14),
    cycleTimes: cycleTimeDays(issues),
  };
}
