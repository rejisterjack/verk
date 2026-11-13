import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  CreateInitiativeForm,
  EditInitiativeForm,
} from "@/components/initiative-forms";
import { ViewToolbar } from "@/components/page-header";
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
} as const;

export default async function InitiativesPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
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

  async function updateInitiative(formData: FormData) {
    "use server";
    const initiativeId = String(formData.get("initiativeId") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const targetRaw = String(formData.get("targetDate") ?? "");

    if (!initiativeId || !name) return;
    await projectsService.updateInitiative(teamId, initiativeId, {
      name,
      health: String(formData.get("health") ?? "ON_TRACK"),
      targetDate: targetRaw ? new Date(targetRaw) : null,
    });
    redirect(`/t/${teamSlug}/initiatives`);
  }

  async function deleteInitiative(formData: FormData) {
    "use server";
    const initiativeId = String(formData.get("initiativeId") ?? "");

    if (!initiativeId) return;
    await projectsService.deleteInitiative(teamId, initiativeId);
    redirect(`/t/${teamSlug}/initiatives`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description="Group projects toward shared outcomes"
        title="Initiatives"
      />

      {!isGuest ? (
        <section className="border-b border-separator px-4 py-3">
          <CreateInitiativeForm
            action={createInitiative}
            submitLabel="Create initiative"
          />
        </section>
      ) : null}

      <section>
        {initiatives.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">
            No initiatives created yet.
          </p>
        ) : (
          <ul className="divide-y divide-separator">
            {initiatives.map((initiative) => {
              const healthKey = (
                initiative.health in HEALTH_CONFIG
                  ? initiative.health
                  : "ON_TRACK"
              ) as keyof typeof HEALTH_CONFIG;
              const healthStyle = HEALTH_CONFIG[healthKey];

              return (
                <li
                  key={initiative.id}
                  className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
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
                        className="text-accent hover:underline"
                        href={`/t/${teamSlug}/roadmap`}
                      >
                        {initiative._count.projects}{" "}
                        {initiative._count.projects === 1
                          ? "project"
                          : "projects"}
                      </NextLink>
                    </div>
                  </div>

                  {!isGuest ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <EditInitiativeForm
                        action={updateInitiative}
                        health={initiative.health}
                        initiativeId={initiative.id}
                        name={initiative.name}
                        targetDate={initiative.targetDate}
                      />
                      <form action={deleteInitiative}>
                        <input
                          name="initiativeId"
                          type="hidden"
                          value={initiative.id}
                        />
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
