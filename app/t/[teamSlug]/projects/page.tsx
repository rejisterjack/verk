import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
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
      <section className="mb-4 space-y-3 rounded-xl border border-separator p-4">
        <form action={createInitiative} className="flex flex-wrap gap-2">
          <input
            required
            className="min-w-[200px] flex-1 rounded-lg border border-separator bg-background px-3 py-2 text-sm"
            name="name"
            placeholder="Initiative name"
          />
          <input
            className="rounded-lg border border-separator bg-background px-3 py-2 text-sm"
            name="targetDate"
            type="date"
          />
          <Button type="submit" variant="tertiary">
            Create initiative
          </Button>
        </form>
        {initiatives.length === 0 ? (
          <p className="text-xs text-muted">No initiatives yet.</p>
        ) : (
          initiatives.map((initiative) => (
            <div
              key={initiative.id}
              className="flex flex-wrap items-center gap-2"
            >
              <form
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
                className="flex flex-1 flex-wrap items-center gap-2 text-xs"
              >
                <input
                  required
                  className="min-w-[160px] flex-1 rounded border border-separator bg-background px-2 py-1"
                  defaultValue={initiative.name}
                  name="name"
                />
                <input
                  className="rounded border border-separator bg-background px-2 py-1"
                  defaultValue={
                    initiative.targetDate
                      ? initiative.targetDate.toISOString().slice(0, 10)
                      : ""
                  }
                  name="targetDate"
                  type="date"
                />
                <select
                  className="rounded border border-separator bg-background px-2 py-1"
                  defaultValue={initiative.health}
                  name="health"
                >
                  <option value="ON_TRACK">On track</option>
                  <option value="AT_RISK">At risk</option>
                  <option value="OFF_TRACK">Off track</option>
                </select>
                <span className="text-muted">
                  {initiative._count.projects} projects
                </span>
                <Button size="sm" type="submit" variant="ghost">
                  Save
                </Button>
              </form>
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
      <form
        action={createProject}
        className="mb-6 flex flex-wrap gap-2 rounded-xl border border-separator p-4"
      >
        <input
          required
          className="min-w-[200px] flex-1 rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          name="name"
          placeholder="Project name"
        />
        <input
          className="min-w-[200px] flex-[2] rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          name="summary"
          placeholder="Summary (optional)"
        />
        <Button type="submit">Create project</Button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <NextLink
            key={p.id}
            className="rounded-xl border border-separator p-4 transition-colors hover:border-accent/40"
            href={`/t/${teamSlug}/projects/${p.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{p.name}</h3>
              <span className="text-xs text-muted">{p.status}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {p.summary || "No summary"}
            </p>
            <p className="mt-3 text-xs text-muted">
              {p._count.issues} issues · {p.milestones.length} milestones
            </p>
          </NextLink>
        ))}
      </div>
    </div>
  );
}
