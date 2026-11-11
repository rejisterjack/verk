import NextLink from "next/link";
import { notFound } from "next/navigation";

import { CreateCycleForm } from "@/components/cycle-forms";
import { SubmitButton as Button } from "@/components/submit-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { createCycleAction, setActiveCycleAction } from "@/lib/actions/cycles";
import { requireTeamBySlug } from "@/lib/rbac";
import * as cyclesService from "@/lib/services/cycles";

export default async function CyclesPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }
  const { team } = teamCtx;
  const cycles = await cyclesService.listCycles(team.id);

  return (
    <div className="space-y-8">
      <PageHeader
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
        description="Time-boxed planning periods — advance creates the next cycle and carries unfinished work"
        title="Cycles"
      />

      <CreateCycleForm
        action={async (formData) => {
          "use server";
          await createCycleAction(teamSlug, formData);
        }}
      />

      {cycles.length === 0 ? (
        <EmptyState
          description="Create a cycle to group issues into a sprint."
          title="No cycles yet"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-separator">
          <table className="w-full text-sm">
            <thead className="border-b border-separator bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Issues</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => (
                <tr
                  key={cycle.id}
                  className="border-b border-separator last:border-0"
                >
                  <td className="px-4 py-3">
                    <NextLink
                      className="font-medium hover:text-accent"
                      href={`/t/${teamSlug}/cycles/${cycle.id}`}
                    >
                      {cycle.name}
                    </NextLink>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {cycle.startDate.toISOString().slice(0, 10)} →{" "}
                    {cycle.endDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">{cycle._count.issues}</td>
                  <td className="px-4 py-3">
                    {cycle.isActive ? (
                      <span className="text-accent text-xs font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="text-muted text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!cycle.isActive ? (
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
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
