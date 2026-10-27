import { notFound } from "next/navigation";

import { IssueEditor } from "@/components/issue-editor";
import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";
import * as cyclesService from "@/lib/services/cycles";
import * as membersService from "@/lib/services/members";

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
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }
  const { team, membership, user } = teamCtx;
  const issue = await issuesService.getIssueByNumber(team.id, issueNumber);

  if (!issue) notFound();

  const [cycles, members] = await Promise.all([
    cyclesService.listCycles(team.id),
    membersService.listMembers(team.id),
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
        assigneeId: issue.assigneeId,
        cycleId: issue.cycleId,
        revision: issue.revision,
      }}
      issueNumber={issue.number}
      members={members.map((m) => m.user)}
      teamId={team.id}
      teamSlug={teamSlug}
    />
  );
}
