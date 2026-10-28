import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/status-chip";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import * as projectsService from "@/lib/services/projects";
import { addProjectUpdate, listProjectUpdates } from "@/lib/services/surface";
import { issueKey } from "@/lib/utils";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ teamSlug: string; projectId: string }>;
}) {
  const { teamSlug, projectId } = await params;
  let teamCtx: Awaited<ReturnType<typeof requireTeamBySlug>>;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }

  const teamId = teamCtx.team.id;
  const project = await projectsService.getProject(teamId, projectId);

  if (!project) notFound();

  const percent = projectsService.projectProgress(project.issues);
  const canAdmin =
    teamCtx.membership.role === "ADMIN" || teamCtx.membership.role === "OWNER";

  const updates = await listProjectUpdates(teamId, projectId);

  async function postUpdate(formData: FormData) {
    "use server";
    await addProjectUpdate(teamId, projectId, teamCtx.user.id, {
      body: String(formData.get("body") ?? ""),
      health: String(formData.get("health") ?? "ON_TRACK"),
    });
    redirect(`/t/${teamSlug}/projects/${projectId}`);
  }

  async function removeProject() {
    "use server";
    await projectsService.deleteProject(teamId, projectId);
    redirect(`/t/${teamSlug}/projects`);
  }

  async function addMilestone(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();

    if (!name) return;
    await projectsService.createMilestone(teamId, projectId, { name });
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        description={`${project.status} · ${percent}% complete · ${project.issues.length} issues`}
        title={project.name}
      />
      <p className="mb-6 text-sm text-muted whitespace-pre-wrap">
        {project.summary || "No summary"}
      </p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold">Milestones</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {project.milestones.map((m) => (
            <li key={m.id} className="text-muted">
              {m.name}
            </li>
          ))}
        </ul>
        <form action={addMilestone} className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-separator bg-background px-3 py-2 text-sm"
            name="name"
            placeholder="New milestone"
          />
          <Button size="sm" type="submit" variant="tertiary">
            Add
          </Button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Updates</h2>
        <form action={postUpdate} className="mt-2 space-y-2">
          <textarea className="min-h-16 w-full rounded-lg border border-separator px-3 py-2 text-sm" name="body" required />
          <select className="rounded-lg border border-separator px-2 py-1 text-sm" name="health" defaultValue="ON_TRACK">
            <option value="ON_TRACK">On track</option>
            <option value="AT_RISK">At risk</option>
            <option value="OFF_TRACK">Off track</option>
          </select>
          <Button type="submit">Post update</Button>
        </form>
        <ul className="mt-3 space-y-2 text-sm">
          {updates.map((update) => (
            <li key={update.id}>
              {update.health}: {update.body}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">Issues</h2>
        <div className="mt-2 divide-y divide-separator rounded-xl border border-separator">
          {project.issues.map((issue) => (
            <NextLink
              key={issue.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-default/40"
              href={`/t/${teamSlug}/issues/${issue.number}`}
            >
              <span className="w-16 shrink-0 text-xs text-muted">
                {issueKey(teamSlug, issue.number)}
              </span>
              <span className="flex-1 font-medium">{issue.title}</span>
              <StatusChip status={issue.status} />
            </NextLink>
          ))}
          {project.issues.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">
              No issues in this project yet. Set project on an issue to link it.
            </p>
          ) : null}
        </div>
      </section>
      {canAdmin ? (
        <form action={removeProject}>
          <Button type="submit" variant="danger">
            Delete project
          </Button>
        </form>
      ) : null}
    </div>
  );
}
