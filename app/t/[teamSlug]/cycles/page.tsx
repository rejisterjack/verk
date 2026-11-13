import NextLink from "next/link";
import { notFound } from "next/navigation";

import { CreateCycleForm } from "@/components/cycle-forms";
import { SubmitButton as Button } from "@/components/submit-button";
import { EmptyState } from "@/components/empty-state";
import { ViewToolbar } from "@/components/page-header";
import { createCycleAction, setActiveCycleAction } from "@/lib/actions/cycles";
import { requireTeamBySlug } from "@/lib/rbac";
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
  const cycles = await cyclesService.listCycles(team.id);

  const now = new Date();
  const upcoming = cycles.filter(
    (c) => !c.isActive && c.startDate.getTime() > now.getTime(),
  );
  const current = cycles.filter((c) => c.isActive);
  const past = cycles.filter(
    (c) => !c.isActive && c.startDate.getTime() <= now.getTime(),
  );
  const sections =
    scope === "current"
      ? [{ label: "Current", rows: current }]
      : scope === "upcoming"
        ? [{ label: "Upcoming", rows: upcoming }]
        : [
            { label: "Current", rows: current },
            { label: "Upcoming", rows: upcoming },
            { label: "Past", rows: past },
          ];

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <form
            action={async () => {
              "use server";
              const ctx = await requireTeamBySlug(teamSlug);

              await cyclesService.advanceCycle(
                ctx.team.id,
                ctx.membership.role,
                {
                  carryOver: true,
                },
              );
            }}
          >
            <Button size="sm" type="submit" variant="secondary">
              Start next cycle
            </Button>
          </form>
        }
        title="Cycles"
      />

      <div className="border-b border-separator px-4 py-3">
        <CreateCycleForm
          action={async (formData) => {
            "use server";
            await createCycleAction(teamSlug, formData);
          }}
        />
      </div>

      {cycles.length === 0 ? (
        <EmptyState
          description="Create a cycle to group issues into a sprint."
          title="No cycles yet"
        />
      ) : (
        <div>
          {sections.map((section) =>
            section.rows.length ? (
              <section key={section.label}>
                <h2 className="border-b border-separator bg-surface/50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                  {section.label}
                </h2>
                <ul className="divide-y divide-separator">
                  {section.rows.map((cycle) => (
                    <li
                      key={cycle.id}
                      className="flex h-[var(--row-h)] items-center gap-3 px-4 text-[13px]"
                    >
                      <NextLink
                        className="min-w-0 flex-1 truncate font-medium hover:text-accent"
                        href={`/t/${teamSlug}/cycles/${cycle.id}`}
                      >
                        {cycle.name}
                      </NextLink>
                      <span className="hidden text-[12px] text-muted sm:inline">
                        {cycle.startDate.toISOString().slice(0, 10)} →{" "}
                        {cycle.endDate.toISOString().slice(0, 10)}
                      </span>
                      <span className="w-16 text-right text-[12px] text-muted">
                        {cycle._count.issues}
                      </span>
                      {cycle.isActive ? (
                        <span className="text-[11px] font-medium text-accent">
                          Active
                        </span>
                      ) : (
                        <form
                          action={async () => {
                            "use server";
                            await setActiveCycleAction(teamSlug, cycle.id);
                          }}
                        >
                          <Button size="sm" type="submit" variant="tertiary">
                            Set active
                          </Button>
                        </form>
                      )}
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
