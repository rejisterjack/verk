import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { FavoriteButton } from "@/components/favorite-button";
import { ViewToolbar } from "@/components/page-header";
import {
  CreateDocumentForm,
  UpdateDocumentForm,
} from "@/components/docs-forms";
import { MarkdownBody } from "@/components/markdown-body";
import {
  AddDependencyForm,
  AddMilestoneForm,
  PostProjectUpdateForm,
  ProjectSettingsForm,
} from "@/components/project-detail-forms";
import { StatusChip } from "@/components/status-chip";
import { SubmitButton as Button } from "@/components/submit-button";
import { linkProjectTeamAction } from "@/lib/actions/planning";
import { requireTeamBySlug } from "@/lib/rbac";
import { siblingTeams } from "@/lib/services/planning";
import { favoriteIds } from "@/lib/services/favorites";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";
import * as dependencyService from "@/lib/services/project-dependencies";
import {
  addProjectUpdate,
  deleteDocument,
  listDocuments,
  listProjectUpdates,
  saveDocument,
} from "@/lib/services/surface";
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

  const [
    updates,
    members,
    initiatives,
    documents,
    starred,
    allProjects,
    dependencies,
    report,
    siblings,
  ] = await Promise.all([
    listProjectUpdates(teamId, projectId),
    membersService.listMembers(teamId),
    projectsService.listInitiatives(teamId),
    listDocuments(teamId),
    favoriteIds(teamCtx.user.id, teamId, "project"),
    projectsService.listProjects(teamId, teamCtx.user.id),
    dependencyService.listDependencies(teamId, teamCtx.user.id),
    dependencyService.dependencyReport(teamId, teamCtx.user.id),
    siblingTeams(teamId),
  ]);
  const projectDocs = documents.filter((doc) => doc.projectId === projectId);
  const waitsOn = dependencies.filter((dep) => dep.projectId === projectId);
  const blocks = dependencies.filter((dep) => dep.dependsOnId === projectId);
  const conflicts = report.conflicts.filter(
    (item) => item.projectId === projectId,
  );
  const canEdit = teamCtx.membership.role !== "GUEST";
  const dependencyOptions = allProjects
    .filter(
      (item) =>
        item.id !== projectId &&
        !waitsOn.some((dep) => dep.dependsOnId === item.id),
    )
    .map((item) => ({ id: item.id, label: item.name }));

  async function postUpdate(formData: FormData) {
    "use server";
    await addProjectUpdate(teamId, projectId, teamCtx.user.id, {
      body: String(formData.get("body") ?? ""),
      health: String(formData.get("health") ?? "ON_TRACK"),
    });
    redirect(`/t/${teamSlug}/projects/${projectId}`);
  }

  async function addDependency(formData: FormData) {
    "use server";
    const dependsOnId = String(formData.get("dependsOnId") ?? "");

    if (!dependsOnId) return;
    try {
      await dependencyService.addDependency(
        teamId,
        projectId,
        dependsOnId,
        teamCtx.membership.role,
      );
    } catch {
      // A loop, duplicate or unknown project: the list below simply stays as it was.
    }
    redirect(`/t/${teamSlug}/projects/${projectId}`);
  }

  async function removeDependency(formData: FormData) {
    "use server";
    await dependencyService.removeDependency(
      teamId,
      projectId,
      String(formData.get("dependsOnId") ?? ""),
      teamCtx.membership.role,
    );
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
    const startRaw = String(formData.get("startDate") ?? "");
    const leadId = String(formData.get("leadId") ?? "");
    const initiativeId = String(formData.get("initiativeId") ?? "");

    await projectsService.updateProject(teamId, projectId, {
      name: String(formData.get("name") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      status: String(formData.get("status") ?? "BACKLOG"),
      leadId: leadId || null,
      initiativeId: initiativeId || null,
      startDate: startRaw ? new Date(startRaw) : null,
      targetDate: targetRaw ? new Date(targetRaw) : null,
    });
    redirect(`/t/${teamSlug}/projects/${projectId}`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <FavoriteButton
            initial={starred.has(projectId)}
            kind="project"
            targetId={projectId}
            teamSlug={teamSlug}
          />
        }
        description={`${project.status.replaceAll("_", " ")} · ${percent}% · ${project.issues.length} issues`}
        title={project.name}
      />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 border-b border-separator lg:border-b-0 lg:border-r">
          <section className="border-b border-separator px-4 py-3">
            <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">
              Documents
            </h2>
            <ul className="mb-3 space-y-3 text-[13px]">
              {projectDocs.map((doc) => (
                <li key={doc.id}>
                  <p className="font-medium">{doc.title}</p>
                  <div className="mt-1">
                    <MarkdownBody text={doc.body} />
                  </div>
                  <UpdateDocumentForm
                    action={async (formData) => {
                      "use server";
                      await saveDocument(
                        teamId,
                        teamCtx.user.id,
                        {
                          title: String(formData.get("title") ?? ""),
                          body: String(formData.get("body") ?? ""),
                          ...(formData.has("baseBody")
                            ? { baseBody: String(formData.get("baseBody")) }
                            : {}),
                          projectId,
                        },
                        doc.id,
                      );
                      redirect(`/t/${teamSlug}/projects/${projectId}`);
                    }}
                    body={doc.body}
                    title={doc.title}
                  />
                  <form
                    action={async () => {
                      "use server";
                      await deleteDocument(teamId, doc.id);
                      redirect(`/t/${teamSlug}/projects/${projectId}`);
                    }}
                    className="mt-2"
                  >
                    <Button size="sm" type="submit" variant="danger">
                      Delete
                    </Button>
                  </form>
                </li>
              ))}
              {projectDocs.length === 0 ? (
                <li className="text-muted">None yet.</li>
              ) : null}
            </ul>
            <CreateDocumentForm
              action={async (formData) => {
                "use server";
                await saveDocument(teamId, teamCtx.user.id, {
                  title: String(formData.get("title") ?? ""),
                  body: String(formData.get("body") ?? ""),
                  projectId,
                });
                redirect(`/t/${teamSlug}/projects/${projectId}`);
              }}
              hiddenProjectId={projectId}
            />
            <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">
              Timeline
            </h2>
            <ul className="mb-4 space-y-1 text-[13px]">
              {[
                ...updates.map((update) => ({
                  at: update.createdAt,
                  label: update.body,
                })),
                ...project.milestones
                  .filter((milestone) => milestone.targetDate)
                  .map((milestone) => ({
                    at: milestone.targetDate!,
                    label: milestone.name,
                  })),
              ]
                .sort((a, b) => a.at.getTime() - b.at.getTime())
                .map((item) => (
                  <li key={item.label + item.at.toISOString()}>
                    <span className="text-muted">
                      {item.at.toISOString().slice(0, 10)}
                    </span>{" "}
                    {item.label}
                  </li>
                ))}
            </ul>
            <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">
              Issues
            </h2>
            <div className="divide-y divide-separator">
              {[
                ...project.milestones.map((milestone) => ({
                  id: milestone.id,
                  name: milestone.name,
                  issues: project.issues.filter(
                    (issue) => issue.milestoneId === milestone.id,
                  ),
                })),
                {
                  id: "none",
                  name: "No milestone",
                  issues: project.issues.filter((issue) => !issue.milestoneId),
                },
              ].map((group) => (
                <div key={group.id} className="py-2">
                  <p className="px-1 text-[11px] uppercase tracking-wide text-muted">
                    {group.name}
                  </p>
                  {group.issues.map((issue) => (
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
                </div>
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
          <section className="border-b border-separator px-4 py-3">
            <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">
              Dependencies
            </h2>
            {conflicts.map((item) => (
              <p
                key={item.dependsOnId + item.kind}
                className="mb-1 text-[12px] text-warning"
              >
                {item.message}
              </p>
            ))}
            <p className="text-[11px] uppercase tracking-wide text-muted">
              Depends on
            </p>
            <ul className="mb-2 space-y-1 text-[13px]">
              {waitsOn.map((dep) => (
                <li key={dep.id} className="flex items-center gap-2">
                  <NextLink
                    className="flex-1 hover:text-accent"
                    href={`/t/${teamSlug}/projects/${dep.dependsOnId}`}
                  >
                    {dep.dependsOnName}
                  </NextLink>
                  {canEdit ? (
                    <form action={removeDependency}>
                      <input
                        name="dependsOnId"
                        type="hidden"
                        value={dep.dependsOnId}
                      />
                      <Button size="sm" type="submit" variant="danger">
                        Remove
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
              {waitsOn.length === 0 ? (
                <li className="text-muted">Nothing.</li>
              ) : null}
            </ul>
            <p className="text-[11px] uppercase tracking-wide text-muted">
              Blocks
            </p>
            <ul className="space-y-1 text-[13px]">
              {blocks.map((dep) => (
                <li key={dep.id}>
                  <NextLink
                    className="hover:text-accent"
                    href={`/t/${teamSlug}/projects/${dep.projectId}`}
                  >
                    {dep.projectName}
                  </NextLink>
                </li>
              ))}
              {blocks.length === 0 ? (
                <li className="text-muted">Nothing.</li>
              ) : null}
            </ul>
            {canEdit ? (
              <AddDependencyForm
                action={addDependency}
                options={dependencyOptions}
              />
            ) : null}
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
          {canAdmin && siblings.length ? (
            <form
              action={linkProjectTeamAction.bind(null, teamSlug, projectId)}
              className="mt-4 space-y-2 text-sm"
            >
              <label className="block text-[11px] uppercase text-muted">
                Contributing team
              </label>
              <select
                className="h-8 w-full rounded border border-separator bg-surface px-2"
                name="teamId"
              >
                {siblings.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <Button type="submit">Link team</Button>
            </form>
          ) : null}
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
