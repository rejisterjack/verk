import NextLink from "next/link";
import { notFound } from "next/navigation";

import { BurndownChart, ScopeSummary } from "@/components/cycle-charts";
import { UpdateCycleForm } from "@/components/cycle-forms";
import { FavoriteButton } from "@/components/favorite-button";
import { SubmitButton as Button } from "@/components/submit-button";
import { ViewToolbar } from "@/components/page-header";
import { PriorityChip, StatusChip } from "@/components/status-chip";
import { deleteCycleAction, updateCycleAction } from "@/lib/actions/cycles";
import { requireTeamBySlug } from "@/lib/rbac";
import { cycleAnalytics } from "@/lib/services/cycle-analytics";
import * as cyclesService from "@/lib/services/cycles";
import { favoriteIds } from "@/lib/services/favorites";
import { estimatePoints } from "@/lib/estimate-points";
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

  const [starred, analytics] = await Promise.all([
    favoriteIds(teamCtx.user.id, teamCtx.team.id, "cycle"),
    cycleAnalytics(teamCtx.team.id, cycleId),
  ]);
  const usePoints = analytics.points.some((p) => p.scope > 0);
  const done = cycle.issues.filter((i) => i.status === "DONE").length;
  const total = cycle.issues.length;
  const points = cycle.issues.reduce(
    (sum, issue) => sum + estimatePoints(issue.estimate),
    0,
  );

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <FavoriteButton
            initial={starred.has(cycleId)}
            kind="cycle"
            targetId={cycleId}
            teamSlug={teamSlug}
          />
        }
        description={`${cycle.startDate.toISOString().slice(0, 10)} → ${cycle.endDate.toISOString().slice(0, 10)} · ${done}/${total} done · ${points}${cycle.capacityPoints == null ? "" : `/${cycle.capacityPoints}`} pts`}
        title={cycle.name}
      />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="space-y-4 border-b border-separator px-4 py-3">
            <div>
              <h2 className="mb-1 text-[12px] font-medium uppercase tracking-wide text-muted">
                Burndown
              </h2>
              <BurndownChart
                data={usePoints ? analytics.points : analytics.issueCount}
                unit={usePoints ? "pts" : "issues"}
              />
            </div>
            <ScopeSummary scope={analytics.scope} />
            {analytics.people.length ? (
              <div>
                <h2 className="mb-1 text-[12px] font-medium uppercase tracking-wide text-muted">
                  By assignee
                </h2>
                <ul className="space-y-1 text-[12px]">
                  {analytics.people.map((person) => (
                    <li key={person.name} className="flex items-center gap-2">
                      <span className="w-32 truncate">{person.name}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-default">
                        <span
                          className="block h-full bg-accent"
                          style={{
                            width: `${person.assigned ? Math.round((person.done / person.assigned) * 100) : 0}%`,
                          }}
                        />
                      </span>
                      <span className="w-24 text-right text-muted">
                        {person.done}/{person.assigned} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
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
