import { notFound } from "next/navigation";

import { IssueEditor } from "@/components/issue-editor";
import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";
import * as cyclesService from "@/lib/services/cycles";
import * as labelsService from "@/lib/services/labels";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";
import * as workspacesService from "@/lib/services/workspaces";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ teamSlug: string; issueNumber: string }>;
}) {
  const { teamSlug, issueNumber: issueNumberRaw } = await params;
  const issueNumber = Number(issueNumberRaw);

  if (!Number.isFinite(issueNumber)) notFound();

  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }
  const { team, membership, user } = teamCtx;
  const issue = await issuesService.getIssueByNumber(team.id, issueNumber);

  if (!issue) notFound();

  const [cycles, members, projects, labels, workflows] = await Promise.all([
    cyclesService.listCycles(team.id),
    membersService.listMembers(team.id),
    projectsService.listProjects(team.id),
    labelsService.listLabels(team.id),
    workspacesService.listWorkflowStatuses(team.id),
  ]);

  const canDelete =
    membership.role === "ADMIN" ||
    membership.role === "OWNER" ||
    issue.creatorId === user.id;

  return (
    <IssueEditor
      canDelete={canDelete}
      cycles={cycles.map((c) => ({ id: c.id, name: c.name }))}
      initialIssue={{
        id: issue.id,
        number: issue.number,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        estimate: issue.estimate,
        dueDate: issue.dueDate?.toISOString() ?? null,
        assigneeId: issue.assigneeId,
        cycleId: issue.cycleId,
        projectId: issue.projectId,
        milestoneId: issue.milestoneId,
        workflowStatusId: issue.workflowStatusId,
        revision: issue.revision,
      }}
      initialLabelIds={issue.labels.map((l) => l.labelId)}
      issueNumber={issue.number}
      labels={labels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      }))}
      members={members.map((m) => m.user)}
      milestones={projects.flatMap((p) =>
        p.milestones.map((m) => ({ id: m.id, name: `${p.name}: ${m.name}` })),
      )}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      workflows={workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
      }))}
      teamId={team.id}
      teamSlug={teamSlug}
    />
  );
}
