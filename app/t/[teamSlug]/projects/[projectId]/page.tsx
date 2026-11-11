import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import {
  AddMilestoneForm,
  PostProjectUpdateForm,
  ProjectSettingsForm,
} from "@/components/project-detail-forms";
import { StatusChip } from "@/components/status-chip";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import * as membersService from "@/lib/services/members";
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

  const [updates, members, initiatives] = await Promise.all([
    listProjectUpdates(teamId, projectId),
    membersService.listMembers(teamId),
    projectsService.listInitiatives(teamId),
  ]);

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
    const targetRaw = String(formData.get("targetDate") ?? "");

    await projectsService.createMilestone(teamId, projectId, {
      name,
      targetDate: targetRaw ? new Date(targetRaw) : null,
    });
    redirect(`/t/${teamSlug}/projects/${projectId}`);
  }

  async function removeMilestone(formData: FormData) {
    "use server";
    await projectsService.deleteMilestone(
      teamId,
      projectId,
      String(formData.get("id") ?? ""),
    );
    redirect(`/t/${teamSlug}/projects/${projectId}`);
  }

  async function saveProject(formData: FormData) {
    "use server";
    const targetRaw = String(formData.get("targetDate") ?? "");
    const leadId = String(formData.get("leadId") ?? "");
    const initiativeId = String(formData.get("initiativeId") ?? "");

    await projectsService.updateProject(teamId, projectId, {
      name: String(formData.get("name") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      status: String(formData.get("status") ?? "BACKLOG"),
      leadId: leadId || null,
      initiativeId: initiativeId || null,
      targetDate: targetRaw ? new Date(targetRaw) : null,
    });
    redirect(`/t/${teamSlug}/projects/${projectId}`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description={`${project.status.replaceAll("_", " ")} · ${percent}% · ${project.issues.length} issues`}
        title={project.name}
      />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 border-b border-separator lg:border-b-0 lg:border-r">
          <section className="border-b border-separator px-4 py-3">
            <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">
              Issues
            </h2>
            <div className="divide-y divide-separator">
              {project.issues.map((issue) => (
                <NextLink
                  key={issue.id}
                  className="flex h-[var(--row-h)] items-center gap-3 text-[13px] hover:bg-default/40"
                  href={`/t/${teamSlug}/issues/${issue.number}`}
                >
                  <span className="w-16 shrink-0 font-mono text-[11px] text-muted">
                    {issueKey(teamSlug, issue.number)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {issue.title}
                  </span>
                  <StatusChip status={issue.status} />
                </NextLink>
              ))}
              {project.issues.length === 0 ? (
                <p className="py-6 text-[13px] text-muted">
                  No issues in this project yet.
                </p>
              ) : null}
            </div>
          </section>
          <section className="border-b border-separator px-4 py-3">
            <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">
              Updates
            </h2>
            <PostProjectUpdateForm action={postUpdate} />
            <ul className="mt-2 space-y-1 text-[13px]">
              {updates.map((update) => (
                <li key={update.id} className="text-muted">
                  <span className="text-foreground">{update.health}</span>:{" "}
                  {update.body}
                </li>
              ))}
            </ul>
          </section>
          <section className="px-4 py-3">
            <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">
              Milestones
            </h2>
            <ul className="space-y-1 text-[13px]">
              {project.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-muted">
                  <span className="flex-1">
                    {m.name}
                    {m.targetDate
                      ? ` · ${m.targetDate.toISOString().slice(0, 10)}`
                      : ""}
                  </span>
                  <form action={removeMilestone}>
                    <input name="id" type="hidden" value={m.id} />
                    <Button size="sm" type="submit" variant="danger">
                      Delete
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
            <AddMilestoneForm action={addMilestone} />
          </section>
        </div>
        <aside className="w-full shrink-0 px-4 py-3 lg:w-72">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">
            Properties
          </p>
          <ProjectSettingsForm
            action={saveProject}
            initiatives={initiatives}
            members={members}
            project={project}
          />
          {canAdmin ? (
            <form action={removeProject} className="mt-4">
              <Button type="submit" variant="danger">
                Delete project
              </Button>
            </form>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
