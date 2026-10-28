import { notFound } from "next/navigation";

import { CreateIssueForm } from "@/components/create-issue-form";
import { IssuesListClient } from "@/components/issues-list-client";
import { PageHeader } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";
import * as cyclesService from "@/lib/services/cycles";
import * as labelsService from "@/lib/services/labels";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";

export default async function TriagePage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }

  const { team } = teamCtx;
  const [{ issues }, cycles, members, projects, labels] = await Promise.all([
    issuesService.listIssues(team.id, { triage: true, take: 100 }),
    cyclesService.listCycles(team.id),
    membersService.listMembers(team.id),
    projectsService.listProjects(team.id),
    labelsService.listLabels(team.id),
  ]);

  return (
    <div>
      <PageHeader
        actions={
          <CreateIssueForm
            cycles={cycles.map((c) => ({ id: c.id, name: c.name }))}
            labels={labels.map((l) => ({
              id: l.id,
              name: l.name,
              color: l.color,
            }))}
            members={members.map((m) => m.user)}
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            teamId={team.id}
            teamSlug={teamSlug}
          />
        }
        description="Review new and unassigned work before it enters the cycle"
        title="Triage"
      />
      {issues.length === 0 ? (
        <p className="text-sm text-muted">Triage is clear.</p>
      ) : (
        <IssuesListClient
          filters={{}}
          initialIssues={issues.map((issue) => ({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            status: issue.status,
            priority: issue.priority,
            assignee: issue.assignee,
            cycle: issue.cycle,
          }))}
          teamId={team.id}
          teamName={team.name}
          teamSlug={teamSlug}
        />
      )}
    </div>
  );
}
