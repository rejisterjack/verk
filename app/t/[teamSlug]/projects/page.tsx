import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  CreateInitiativeForm,
  EditInitiativeInlineForm,
} from "@/components/initiative-forms";
import { EmptyState } from "@/components/empty-state";
import { ViewToolbar } from "@/components/page-header";
import { CreateProjectForm } from "@/components/projects-page-forms";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import * as projectsService from "@/lib/services/projects";

export default async function ProjectsPage({
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
  const projects = await projectsService.listProjects(teamId);
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
    redirect(`/t/${teamSlug}/projects`);
  }

  async function createProject(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();

    if (!name) return;
    const created = await projectsService.createProject(teamId, {
      name,
      summary: String(formData.get("summary") ?? ""),
    });

    redirect(`/t/${teamSlug}/projects/${created.id}`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar title="Projects" />
      <section className="space-y-3 border-b border-separator px-4 py-3">
        <h2 className="text-[12px] font-medium uppercase tracking-wide text-muted">
          Initiatives
        </h2>
        <CreateInitiativeForm
          action={createInitiative}
          submitLabel="Create initiative"
          variant="secondary"
        />
        {initiatives.length === 0 ? (
          <p className="text-sm text-muted">No initiatives yet.</p>
        ) : (
          initiatives.map((initiative) => (
            <div
              key={initiative.id}
              className="flex flex-wrap items-center gap-2"
            >
              <EditInitiativeInlineForm
                action={async (formData) => {
                  "use server";
                  const name = String(formData.get("name") ?? "").trim();
                  const targetRaw = String(formData.get("targetDate") ?? "");

                  if (!name) return;
                  await projectsService.updateInitiative(
                    teamId,
                    initiative.id,
                    {
                      name,
                      health: String(formData.get("health") ?? "ON_TRACK"),
                      targetDate: targetRaw ? new Date(targetRaw) : null,
                    },
                  );
                  redirect(`/t/${teamSlug}/projects`);
                }}
                health={initiative.health}
                name={initiative.name}
                projectCount={initiative._count.projects}
                targetDate={initiative.targetDate}
              />
              <form
                action={async () => {
                  "use server";
                  await projectsService.deleteInitiative(teamId, initiative.id);
                  redirect(`/t/${teamSlug}/projects`);
                }}
              >
                <Button size="sm" type="submit" variant="danger">
                  Delete
                </Button>
              </form>
            </div>
          ))
        )}
      </section>
      <div className="px-4 py-3">
        <CreateProjectForm action={createProject} />
      </div>
      {projects.length === 0 ? (
        <EmptyState
          description="Create a project to group related issues and track progress."
          title="No projects yet"
        />
      ) : (
        <ul className="divide-y divide-separator border-t border-separator">
          {projects.map((p) => (
            <li key={p.id}>
              <NextLink
                className="flex items-center gap-3 px-4 py-2 text-[13px] transition-colors hover:bg-default/40"
                href={`/t/${teamSlug}/projects/${p.id}`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.name}
                </span>
                <span className="hidden truncate text-[12px] text-muted sm:inline">
                  {p.summary || "No summary"}
                </span>
                <span className="shrink-0 text-[11px] text-muted">
                  {p._count.issues} issues
                </span>
                <span className="shrink-0 rounded-md bg-default px-1.5 py-0.5 text-[11px] capitalize text-muted">
                  {p.status.replaceAll("_", " ").toLowerCase()}
                </span>
              </NextLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
