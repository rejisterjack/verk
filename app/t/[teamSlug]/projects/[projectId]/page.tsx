import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
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
    <div className="max-w-3xl">
      <PageHeader
        description={`${project.status} · ${percent}% complete · ${project.issues.length} issues`}
        title={project.name}
      />
      <form action={saveProject} className="mb-8 space-y-2 rounded-xl border border-separator p-4">
        <input className="w-full rounded-lg border border-separator px-3 py-2 text-sm" defaultValue={project.name} name="name" required />
        <textarea className="min-h-16 w-full rounded-lg border border-separator px-3 py-2 text-sm" defaultValue={project.summary} name="summary" />
        <select className="rounded-lg border border-separator px-2 py-1 text-sm" defaultValue={project.status} name="status">
          <option value="BACKLOG">Backlog</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select className="rounded-lg border border-separator px-2 py-1 text-sm" defaultValue={project.leadId ?? ""} name="leadId">
          <option value="">No lead</option>
          {members.map((member) => (
            <option key={member.user.id} value={member.user.id}>
              {member.user.name ?? member.user.email}
            </option>
          ))}
        </select>
        <select className="rounded-lg border border-separator px-2 py-1 text-sm" defaultValue={project.initiativeId ?? ""} name="initiativeId">
          <option value="">No initiative</option>
          {initiatives.map((initiative) => (
            <option key={initiative.id} value={initiative.id}>
              {initiative.name}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border border-separator px-3 py-2 text-sm"
          defaultValue={project.targetDate ? project.targetDate.toISOString().slice(0, 10) : ""}
          name="targetDate"
          type="date"
        />
        <Button type="submit">Save project</Button>
      </form>

      <section className="mb-8">
        <h2 className="text-sm font-semibold">Milestones</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {project.milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-muted">
              <span>
                {m.name}
                {m.targetDate ? ` · ${m.targetDate.toISOString().slice(0, 10)}` : ""}
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
        <form action={addMilestone} className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-separator bg-background px-3 py-2 text-sm"
            name="name"
            placeholder="New milestone"
          />
          <input className="rounded-lg border border-separator bg-background px-3 py-2 text-sm" name="targetDate" type="date" />
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
