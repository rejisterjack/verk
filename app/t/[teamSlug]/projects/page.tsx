import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { Chip } from "@heroui/react";

import {
  CreateInitiativeForm,
  EditInitiativeInlineForm,
} from "@/components/initiative-forms";
import { PageHeader } from "@/components/page-header";
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
    <div>
      <PageHeader
        description="Group issues around a shared outcome"
        title="Projects"
      />
      <section className="mb-6 space-y-4 rounded-xl border border-separator p-4">
        <h2 className="text-sm font-semibold">Initiatives</h2>
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
      <CreateProjectForm action={createProject} />
      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <NextLink
            key={p.id}
            className="rounded-xl border border-separator p-4 transition-colors hover:border-accent/40"
            href={`/t/${teamSlug}/projects/${p.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{p.name}</h3>
              <Chip size="sm" variant="soft">
                {p.status.replaceAll("_", " ")}
              </Chip>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {p.summary || "No summary"}
            </p>
            <p className="mt-3 text-xs text-muted">
              {p._count.issues} issues · {p.milestones.length}{" "}
              {p.milestones.length === 1 ? "milestone" : "milestones"}
            </p>
          </NextLink>
        ))}
      </div>
    </div>
  );
}
