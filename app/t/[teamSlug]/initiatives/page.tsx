import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  CreateInitiativeForm,
  EditInitiativeForm,
} from "@/components/initiative-forms";
import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import * as projectsService from "@/lib/services/projects";

const HEALTH_CONFIG = {
  ON_TRACK: {
    label: "On track",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  AT_RISK: {
    label: "At risk",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  OFF_TRACK: {
    label: "Off track",
    className: "bg-danger/10 text-danger border-danger/30",
  },
};

export default async function InitiativesPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx: Awaited<ReturnType<typeof requireTeamBySlug>>;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }

  const teamId = teamCtx.team.id;
  const isGuest = teamCtx.membership.role === "GUEST";
  const initiatives = await projectsService.listInitiatives(teamId);

  async function createInitiative(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const targetRaw = String(formData.get("targetDate") ?? "");

    if (!name) return;
    await projectsService.createInitiative(teamId, {
      name,
      targetDate: targetRaw ? new Date(targetRaw) : null,
    });
    redirect(`/t/${teamSlug}/initiatives`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="High-level strategic outcomes grouping projects together across teams"
        title="Initiatives"
      />

      {!isGuest ? (
        <section className="rounded-xl border border-separator bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">New initiative</h2>
          <CreateInitiativeForm
            action={createInitiative}
            submitLabel="Create initiative"
          />
        </section>
      ) : null}

      <section className="space-y-3">
        {initiatives.length === 0 ? (
          <div className="rounded-xl border border-separator bg-surface/50 p-8 text-center text-sm text-muted">
            No initiatives created yet.
          </div>
        ) : (
          <ul className="divide-y divide-separator rounded-xl border border-separator bg-surface">
            {initiatives.map((initiative) => {
              const health = (
                initiative.health in HEALTH_CONFIG
                  ? initiative.health
                  : "ON_TRACK"
              ) as keyof typeof HEALTH_CONFIG;
              const healthStyle = HEALTH_CONFIG[health];

              return (
                <li
                  key={initiative.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {initiative.name}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${healthStyle.className}`}
                      >
                        {healthStyle.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      {initiative.targetDate ? (
                        <span>
                          Target:{" "}
                          {new Date(initiative.targetDate).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      ) : (
                        <span>No target date</span>
                      )}
                      <span>·</span>
                      <NextLink
                        className="text-accent underline hover:text-accent/80"
                        href={`/t/${teamSlug}/roadmap`}
                      >
                        {initiative._count.projects}{" "}
                        {initiative._count.projects === 1
                          ? "project"
                          : "projects"}{" "}
                        (View on Roadmap)
                      </NextLink>
                    </div>
                  </div>

                  {!isGuest ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <EditInitiativeForm
                        action={async (formData) => {
                          "use server";
                          const name = String(
                            formData.get("name") ?? "",
                          ).trim();
                          const targetRaw = String(
                            formData.get("targetDate") ?? "",
                          );

                          if (!name) return;
                          await projectsService.updateInitiative(
                            teamId,
                            initiative.id,
                            {
                              name,
                              health: String(
                                formData.get("health") ?? "ON_TRACK",
                              ),
                              targetDate: targetRaw
                                ? new Date(targetRaw)
                                : null,
                            },
                          );
                          redirect(`/t/${teamSlug}/initiatives`);
                        }}
                        health={initiative.health}
                        name={initiative.name}
                        targetDate={initiative.targetDate}
                      />
                      <form
                        action={async () => {
                          "use server";
                          await projectsService.deleteInitiative(
                            teamId,
                            initiative.id,
                          );
                          redirect(`/t/${teamSlug}/initiatives`);
                        }}
                      >
                        <Button size="sm" type="submit" variant="danger">
                          Delete
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
