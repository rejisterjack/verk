import { CreateIssueForm } from "@/components/create-issue-form";
import * as cyclesService from "@/lib/services/cycles";
import * as labelsService from "@/lib/services/labels";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";
import { listTemplates } from "@/lib/services/surface";
import * as workspacesService from "@/lib/services/workspaces";

/** Mount once in team layout so C / sidebar + work from every page. */
export async function GlobalCreateIssue({
  teamId,
  teamSlug,
}: {
  teamId: string;
  teamSlug: string;
}) {
  const [cycles, members, projects, labels, workflows, templates] =
    await Promise.all([
      cyclesService.listCycles(teamId),
      membersService.listMembers(teamId),
      projectsService.listProjects(teamId),
      labelsService.listLabels(teamId),
      workspacesService.listWorkflowStatuses(teamId),
      listTemplates(teamId),
    ]);

  return (
    <CreateIssueForm
      hideTrigger
      cycles={cycles.map((c) => ({ id: c.id, name: c.name }))}
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
      teamId={teamId}
      teamSlug={teamSlug}
      templates={templates.map((template) => ({
        id: template.id,
        name: template.name,
        title: template.title,
        description: template.description,
        priority: template.priority,
        estimate: template.estimate,
      }))}
      workflows={workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
      }))}
    />
  );
}
