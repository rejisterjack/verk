import NextLink from "next/link";
import { notFound } from "next/navigation";

import { UpdateCycleForm } from "@/components/cycle-forms";
import { SubmitButton as Button } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";
import { PriorityChip, StatusChip } from "@/components/status-chip";
import { deleteCycleAction, updateCycleAction } from "@/lib/actions/cycles";
import { requireTeamBySlug } from "@/lib/rbac";
import * as cyclesService from "@/lib/services/cycles";
import { issueKey } from "@/lib/utils";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ teamSlug: string; cycleId: string }>;
}) {
  const { teamSlug, cycleId } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }

  const cycle = await cyclesService.getCycle(teamCtx.team.id, cycleId);

  if (!cycle) notFound();

  const done = cycle.issues.filter((i) => i.status === "DONE").length;
  const total = cycle.issues.length;

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        description={`${cycle.startDate.toISOString().slice(0, 10)} → ${cycle.endDate.toISOString().slice(0, 10)} · ${done}/${total} done`}
        title={cycle.name}
      />
      <div className="h-2 overflow-hidden rounded-full bg-default">
        <svg className="h-16 w-full" role="img" viewBox="0 0 80 40">
          <title>Issues completed by day</title>
          {Array.from({ length: 8 }).map((_, index) => {
            const day = new Date(cycle.endDate);

            day.setDate(day.getDate() - (7 - index));
            const count = cycle.issues.filter((issue) => {
              if (issue.status !== "DONE") return false;
              const updated = issue.updatedAt;

              return (
                updated.getUTCFullYear() === day.getUTCFullYear() &&
                updated.getUTCMonth() === day.getUTCMonth() &&
                updated.getUTCDate() === day.getUTCDate()
              );
            }).length;
            const height = Math.min(36, count * 8);

            return (
              <rect
                key={index}
                fill="currentColor"
                height={height}
                width="6"
                x={index * 10}
                y={38 - height}
              />
            );
          })}
        </svg>
      </div>
      <p className="text-xs text-muted">
        {Object.entries(
          cycle.issues.reduce<Record<string, number>>((acc, issue) => {
            acc[issue.status] = (acc[issue.status] ?? 0) + 1;

            return acc;
          }, {}),
        )
          .map(([status, count]) => `${status} ${count}`)
          .join(" · ") || "No issues"}
      </p>

      <UpdateCycleForm
        action={async (formData) => {
          "use server";
          await updateCycleAction(teamSlug, cycleId, formData);
        }}
        cycle={cycle}
      />

      <div className="overflow-x-auto rounded-xl border border-separator">
        <table className="w-full text-sm">
          <thead className="border-b border-separator bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
            </tr>
          </thead>
          <tbody>
            {cycle.issues.map((issue) => (
              <tr
                key={issue.id}
                className="border-b border-separator last:border-0"
              >
                <td className="px-4 py-3 text-muted">
                  {issueKey(teamSlug, issue.number)}
                </td>
                <td className="px-4 py-3">
                  <NextLink
                    className="hover:text-accent"
                    href={`/t/${teamSlug}/issues/${issue.number}`}
                  >
                    {issue.title}
                  </NextLink>
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={issue.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityChip priority={issue.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {teamCtx.membership.role === "ADMIN" ||
      teamCtx.membership.role === "OWNER" ? (
        <form
          action={async () => {
            "use server";
            await deleteCycleAction(teamSlug, cycleId);
          }}
        >
          <Button type="submit" variant="danger">
            Delete cycle
          </Button>
        </form>
      ) : null}
    </div>
  );
}
