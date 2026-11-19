import { notFound } from "next/navigation";

import { canSeeIssue } from "@/lib/services/guest-scope";
import { IssueEditor } from "@/components/issue-editor";
import { requireTeamBySlug } from "@/lib/rbac";
import { favoriteIds } from "@/lib/services/favorites";
import * as issuesService from "@/lib/services/issues";
import * as cyclesService from "@/lib/services/cycles";
import * as labelsService from "@/lib/services/labels";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";
import { getWorkflow } from "@/lib/services/workflow";

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

  if (!issue || !(await canSeeIssue(team.id, user.id, issue))) notFound();

  const [starred, readerIds] = await Promise.all([
    favoriteIds(user.id, team.id, "issue"),
    issuesService.listIssueReaderIds(issue.id),
  ]);
  const [cycles, members, projects, labels, workflows] = await Promise.all([
    cyclesService.listCycles(team.id),
    membersService.listMembers(team.id),
    projectsService.listProjects(team.id),
    labelsService.listLabels(team.id),
    getWorkflow(team.id),
  ]);

  const isGuest = membership.role === "GUEST";
  const canDelete =
    !isGuest &&
    (membership.role === "ADMIN" ||
      membership.role === "OWNER" ||
      issue.creatorId === user.id);

  return (
    <IssueEditor
      archived={Boolean(issue.archivedAt)}
      canDelete={canDelete}
      createdAt={issue.createdAt.toISOString()}
      currentUserId={user.id}
      cycles={cycles.map((c) => ({ id: c.id, name: c.name }))}
      estimateScale={team.estimateScale}
      favorite={starred.has(issue.id)}
      githubRepo={team.githubRepo}
      initialIssue={{
        id: issue.id,
        number: issue.number,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        estimate: issue.estimate,
        dueDate: issue.dueDate?.toISOString() ?? null,
        startDate: issue.startDate?.toISOString() ?? null,
        visibility: issue.visibility,
        assigneeId: issue.assigneeId,
        cycleId: issue.cycleId,
        projectId: issue.projectId,
        milestoneId: issue.milestoneId,
        workflowStatusId: issue.workflowStatusId,
        revision: issue.revision,
      }}
      initialLabelIds={issue.labels.map((l) => l.labelId)}
      readerIds={readerIds}
      issueNumber={issue.number}
      labels={labels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        group: l.group,
      }))}
      members={members.map((m) => m.user)}
      milestones={projects.flatMap((p) =>
        p.milestones.map((m) => ({ id: m.id, name: `${p.name}: ${m.name}` })),
      )}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      readOnly={isGuest}
      slaHours={team.slaHours}
      slaWindow={{
        timezone: team.timezone,
        startHour: team.slaStartHour,
        endHour: team.slaEndHour,
        weekdays: team.slaWeekdays,
      }}
      teamId={team.id}
      teamSlug={teamSlug}
      workflows={workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        key: workflow.key,
      }))}
    />
  );
}
