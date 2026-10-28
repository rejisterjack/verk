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
