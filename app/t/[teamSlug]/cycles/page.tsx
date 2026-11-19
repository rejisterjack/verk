import NextLink from "next/link";
import { notFound } from "next/navigation";

import { VelocityChart } from "@/components/cycle-charts";
import { CreateCycleForm } from "@/components/cycle-forms";
import { SubmitButton as Button } from "@/components/submit-button";
import { EmptyState } from "@/components/empty-state";
import { ViewToolbar } from "@/components/page-header";
import {
  advanceCycleAction,
  createCycleAction,
  scheduleNextCycleAction,
  setActiveCycleAction,
} from "@/lib/actions/cycles";
import { requireTeamBySlug } from "@/lib/rbac";
import { teamVelocity } from "@/lib/services/cycle-analytics";
import * as cyclesService from "@/lib/services/cycles";

export default async function CyclesPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const { teamSlug } = await params;
  const { scope } = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }
  const { team } = teamCtx;
  const [cycles, velocity] = await Promise.all([
    cyclesService.listCycles(team.id),
    teamVelocity(team.id),
  ]);

  const now = new Date();
  const upcoming = cycles.filter(
    (c) => !c.isActive && c.startDate.getTime() > now.getTime(),
  );
  const current = cycles.filter((c) => c.isActive);
  const past = cycles.filter(
    (c) => !c.isActive && c.startDate.getTime() <= now.getTime(),
  );
  const isCurrentView = scope === "current";
  const isUpcomingView = scope === "upcoming";
  const isScopedView = isCurrentView || isUpcomingView;

  const sections = isCurrentView
    ? [{ label: "Current", rows: current }]
    : isUpcomingView
      ? [{ label: "Upcoming", rows: upcoming }]
      : [
          { label: "Current", rows: current },
          { label: "Upcoming", rows: upcoming },
          { label: "Past", rows: past },
        ];

  const visibleRows = sections.flatMap((section) => section.rows);

  const cycleListColumns =
    "grid grid-cols-[minmax(0,1fr)_0_minmax(2.25rem,auto)_5.5rem] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_11.5rem_2.25rem_5.5rem]";

  const toolbarTitle = isCurrentView
    ? "Current"
    : isUpcomingView
      ? "Upcoming"
      : "Cycles";

  const toolbarDescription = isCurrentView
    ? "The sprint cycle in progress"
    : isUpcomingView
      ? "Scheduled cycles that have not started yet"
      : undefined;

  const scheduleForm = (
    <form
      action={async () => {
        "use server";
        await scheduleNextCycleAction(teamSlug);
      }}
    >
      <Button className="h-7" size="sm" type="submit" variant="secondary">
        Schedule upcoming
      </Button>
    </form>
  );

  const advanceForm = (
    <form
      action={async () => {
        "use server";
        await advanceCycleAction(teamSlug);
      }}
    >
      <Button className="h-7" size="sm" type="submit" variant="secondary">
        Start next cycle
      </Button>
    </form>
  );

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          isCurrentView ? (
            advanceForm
          ) : isUpcomingView ? (
            scheduleForm
          ) : (
            <>
              {scheduleForm}
              {advanceForm}
            </>
          )
        }
        description={toolbarDescription}
        title={toolbarTitle}
      />

      {!isCurrentView ? (
        <section className="border-b border-separator px-4 py-3">
          <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">
            {isUpcomingView ? "Add upcoming cycle" : "New cycle"}
          </h2>
          <CreateCycleForm
            action={async (formData) => {
              "use server";
              await createCycleAction(teamSlug, formData);
            }}
          />
        </section>
      ) : null}

      {!isScopedView && velocity.points.length > 1 ? (
        <div className="border-b border-separator px-4 py-3">
          <h2 className="mb-1 text-[12px] font-medium uppercase tracking-wide text-muted">
            Velocity
          </h2>
          <VelocityChart
            average={velocity.average}
            points={velocity.points}
            unit="pts"
          />
        </div>
      ) : null}

      {cycles.length === 0 ? (
        <EmptyState
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {scheduleForm}
              {advanceForm}
            </div>
          }
          description="Create a cycle to group issues into a sprint."
          title="No cycles yet"
        />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          action={
            isCurrentView
              ? advanceForm
              : isUpcomingView
                ? scheduleForm
                : undefined
          }
          description={
            isCurrentView
              ? "Start the next cycle or mark a past cycle as active."
              : "Schedule the next cycle from team settings or add one manually."
          }
          title={isCurrentView ? "No active cycle" : "No upcoming cycles"}
        />
      ) : (
        <div>
          <div
            className={`${cycleListColumns} border-b border-separator/70 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted`}
          >
            <span>Cycle</span>
            <span className="hidden overflow-hidden sm:block">Dates</span>
            <span className="text-right">Issues</span>
            <span className="sr-only">Status</span>
          </div>
          {sections.map((section) =>
            section.rows.length ? (
              <section key={section.label}>
                {isScopedView ? null : (
                  <h2 className="border-b border-separator bg-surface/50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                    {section.label}
                  </h2>
                )}
                <ul className="divide-y divide-separator">
                  {section.rows.map((cycle) => (
                    <li
                      key={cycle.id}
                      className={`${cycleListColumns} h-[var(--row-h)] px-4 text-[13px] hover:bg-default/40`}
                    >
                      <NextLink
                        className="min-w-0 truncate font-medium hover:text-accent"
                        href={`/t/${teamSlug}/cycles/${cycle.id}`}
                      >
                        {cycle.name}
                      </NextLink>
                      <span className="hidden truncate text-[12px] tabular-nums text-muted sm:block">
                        {cycle.startDate.toISOString().slice(0, 10)} →{" "}
                        {cycle.endDate.toISOString().slice(0, 10)}
                      </span>
                      <span
                        className="text-right text-[12px] tabular-nums text-muted"
                        title="Issues in cycle"
                      >
                        {cycle._count.issues}
                      </span>
                      <div className="flex justify-end">
                        {cycle.isActive ? (
                          <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                            Active
                          </span>
                        ) : isCurrentView ? (
                          <form
                            action={async () => {
                              "use server";
                              await setActiveCycleAction(teamSlug, cycle.id);
                            }}
                          >
                            <Button size="sm" type="submit" variant="secondary">
                              Set active
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
