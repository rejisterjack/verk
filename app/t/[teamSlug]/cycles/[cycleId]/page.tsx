import NextLink from "next/link";
import { notFound } from "next/navigation";

import { UpdateCycleForm } from "@/components/cycle-forms";
import { SubmitButton as Button } from "@/components/submit-button";
import { ViewToolbar } from "@/components/page-header";
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
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description={`${cycle.startDate.toISOString().slice(0, 10)} → ${cycle.endDate.toISOString().slice(0, 10)} · ${done}/${total} done`}
        title={cycle.name}
      />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="border-b border-separator px-4 py-3">
            <svg
              className="h-12 w-full text-accent"
              role="img"
              viewBox="0 0 80 40"
            >
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
            <p className="mt-2 text-[11px] text-muted">
              {Object.entries(
                cycle.issues.reduce<Record<string, number>>((acc, issue) => {
                  acc[issue.status] = (acc[issue.status] ?? 0) + 1;

                  return acc;
                }, {}),
              )
                .map(([status, count]) => `${status} ${count}`)
                .join(" · ") || "No issues"}
            </p>
          </div>
          <ul className="divide-y divide-separator">
            {cycle.issues.map((issue) => (
              <li
                key={issue.id}
                className="flex h-[var(--row-h)] items-center gap-3 px-4 text-[13px]"
              >
                <span className="w-16 shrink-0 font-mono text-[11px] text-muted">
                  {issueKey(teamSlug, issue.number)}
                </span>
                <NextLink
                  className="min-w-0 flex-1 truncate hover:text-accent"
                  href={`/t/${teamSlug}/issues/${issue.number}`}
                >
                  {issue.title}
                </NextLink>
                <StatusChip status={issue.status} />
                <PriorityChip priority={issue.priority} />
              </li>
            ))}
          </ul>
        </div>
        <aside className="w-full shrink-0 border-t border-separator px-4 py-3 lg:w-72 lg:border-l lg:border-t-0">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">
            Properties
          </p>
          <UpdateCycleForm
            action={async (formData) => {
              "use server";
              await updateCycleAction(teamSlug, cycleId, formData);
            }}
            cycle={cycle}
          />
          {teamCtx.membership.role === "ADMIN" ||
          teamCtx.membership.role === "OWNER" ? (
            <form
              action={async () => {
                "use server";
                await deleteCycleAction(teamSlug, cycleId);
              }}
              className="mt-4"
            >
              <Button type="submit" variant="danger">
                Delete cycle
              </Button>
            </form>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
