import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import { notFound, redirect } from "next/navigation";
import NextLink from "next/link";

import { BoardView } from "@/components/board-view";
import { CreateIssueForm } from "@/components/create-issue-form";
import {
  IssueFiltersForm,
  SaveViewForm,
} from "@/components/issue-filters-form";
import { EmptyState } from "@/components/empty-state";
import { IssuesListClient } from "@/components/issues-list-client";
import { PageHeader } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";
import * as cyclesService from "@/lib/services/cycles";
import * as labelsService from "@/lib/services/labels";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";
import * as viewsService from "@/lib/services/views";
import * as workspacesService from "@/lib/services/workspaces";
import {
  WORKFLOW_KEY_TO_STATUS,
  WORKFLOW_TYPE_TO_STATUS,
  statusToWorkflowKey,
} from "@/lib/labels";
import { listTemplates } from "@/lib/services/surface";

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{
    status?: string;
    priority?: string;
    cycleId?: string;
    search?: string;
    assignee?: string;
    layout?: string;
    view?: string;
    group?: string;
    workflowStatusId?: string;
    labelGroup?: string;
  }>;
}) {
  const { teamSlug } = await params;
  const query = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }
  const { team, user } = teamCtx;

  let filters: {
    status?: IssueStatus;
    priority?: Priority;
    cycleId?: string;
    search?: string;
    assigneeId?: string;
    workflowStatusId?: string;
    labelGroup?: string;
  } = {
    status: query.status as IssueStatus | undefined,
    priority: query.priority as Priority | undefined,
    cycleId: query.cycleId,
    search: query.search,
    workflowStatusId: query.workflowStatusId,
    labelGroup: query.labelGroup?.trim() || undefined,
  };

  if (query.view) {
    const views = await viewsService.listViews(team.id);
    const saved = views.find((v) => v.id === query.view);

    if (saved && saved.filterJson && typeof saved.filterJson === "object") {
      filters = { ...filters, ...(saved.filterJson as typeof filters) };
      if (saved.layout === "BOARD" && !query.layout) {
        redirect(`/t/${teamSlug}/issues?view=${saved.id}&layout=board`);
      }
    }
  }

  if (query.assignee === "me") {
    filters.assigneeId = user.id;
  }

  const isBoard = query.layout === "board";
  const mine = query.assignee === "me";

  const [
    listResult,
    boardIssues,
    cycles,
    members,
    projects,
    labels,
    workflows,
    templates,
  ] = await Promise.all([
    isBoard
      ? Promise.resolve({
          issues: [] as Awaited<
            ReturnType<typeof issuesService.listIssues>
          >["issues"],
          nextCursor: undefined as string | undefined,
        })
      : issuesService.listIssues(team.id, { ...filters, take: 100 }),
    isBoard
      ? issuesService.getBoardIssues(team.id, {
          cycleId: filters.cycleId,
          priority: filters.priority,
          search: filters.search,
          labelGroup: filters.labelGroup,
        })
      : Promise.resolve([]),
    cyclesService.listCycles(team.id),
    membersService.listMembers(team.id),
    projectsService.listProjects(team.id),
    labelsService.listLabels(team.id),
    workspacesService.listWorkflowStatuses(team.id),
    listTemplates(team.id),
  ]);

  const visibleWorkflows = workflows.filter((w) => w.type !== "canceled");
  const boardColumns = visibleWorkflows.map((w) => w.key);
  const columnLabels = Object.fromEntries(
    visibleWorkflows.map((w) => [w.key, w.name]),
  );
  const columnStatus = Object.fromEntries(
    visibleWorkflows.map((w) => [
      w.key,
      WORKFLOW_KEY_TO_STATUS[w.key] ??
        WORKFLOW_TYPE_TO_STATUS[w.type] ??
        "TODO",
    ]),
  );
  const columnWorkflowIds = Object.fromEntries(
    visibleWorkflows.map((w) => [w.key, w.id]),
  );
  const workflowById = new Map(workflows.map((w) => [w.id, w.key]));

  const projectOpts = projects.map((p) => ({ id: p.id, name: p.name }));
  const milestoneOpts = projects.flatMap((p) =>
    p.milestones.map((m) => ({ id: m.id, name: `${p.name}: ${m.name}` })),
  );
  const labelOpts = labels.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
    group: l.group,
  }));
  const labelGroups = [
    ...new Set(
      labels.flatMap((label) =>
        label.group?.trim() ? [label.group.trim()] : [],
      ),
    ),
  ].sort();
  const groupLabelIds = filters.labelGroup
    ? labels
        .filter((label) => label.group?.trim() === filters.labelGroup)
        .map((label) => label.id)
    : undefined;
  const cycleOpts = cycles.map((c) => ({ id: c.id, name: c.name }));
  const memberOpts = members.map((m) => m.user);

  const issues = isBoard
    ? boardIssues.filter((i) =>
        filters.assigneeId ? i.assigneeId === filters.assigneeId : true,
      )
    : listResult.issues;

  const activeCycle = cycles.find((c) => c.isActive);
  const title = mine ? "My issues" : isBoard ? "Board" : "Issues";

  return (
    <div>
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-separator text-sm">
              <NextLink
                className={`px-3 py-1.5 ${!isBoard ? "bg-accent/15 text-accent" : "text-muted"}`}
                href={`/t/${teamSlug}/issues${mine ? "?assignee=me" : ""}`}
              >
                List
              </NextLink>
              <NextLink
                className={`px-3 py-1.5 ${isBoard ? "bg-accent/15 text-accent" : "text-muted"}`}
                href={`/t/${teamSlug}/issues?layout=board${mine ? "&assignee=me" : ""}`}
              >
                Board
              </NextLink>
              <NextLink
                className="px-3 py-1.5 text-muted"
                href={`/t/${teamSlug}/issues?layout=board&group=priority`}
              >
                By priority
              </NextLink>
              <NextLink
                className="px-3 py-1.5 text-muted"
                href={`/t/${teamSlug}/issues?layout=board&group=project`}
              >
                By project
              </NextLink>
            </div>
            <CreateIssueForm
              cycles={cycleOpts}
              labels={labelOpts}
              members={memberOpts}
              milestones={milestoneOpts}
              projects={projectOpts}
              teamId={team.id}
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
          </div>
        }
        description={
          activeCycle
            ? `Active cycle: ${activeCycle.name} · Press C to create · ⌘K for commands`
            : "Press C to create · ⌘K for commands"
        }
        title={title}
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <IssueFiltersForm
          activeCycleId={activeCycle?.id}
          cycles={cycles.map((c) => ({ id: c.id, name: c.name }))}
          cycleId={query.cycleId}
          hidden={{
            assignee: mine ? "me" : undefined,
            layout: isBoard ? "board" : undefined,
            view: query.view,
            group: query.group,
          }}
          labelGroup={filters.labelGroup}
          labelGroups={labelGroups}
          priority={query.priority}
          search={query.search}
          workflowStatusId={query.workflowStatusId}
          workflows={workflows.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
          }))}
        />
        <SaveViewButton
          filters={{
            status: query.status,
            cycleId: query.cycleId,
            search: query.search,
            labelGroup: filters.labelGroup,
            assigneeId: mine ? user.id : undefined,
          }}
          teamId={team.id}
        />
      </div>

      {issues.length === 0 ? (
        <EmptyState
          action={
            <CreateIssueForm
              cycles={cycleOpts}
              labels={labelOpts}
              members={memberOpts}
              milestones={milestoneOpts}
              projects={projectOpts}
              teamId={team.id}
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
          }
          description="Create your first issue or import from Linear in Settings → Import."
          title="No issues yet"
        />
      ) : isBoard ? (
        <BoardView
          columnLabels={columnLabels}
          columnStatus={columnStatus}
          columnWorkflowIds={columnWorkflowIds}
          columns={
            query.group === "priority"
              ? ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"]
              : query.group === "project"
                ? ["none", ...projectOpts.map((project) => project.id)]
                : boardColumns.length
                  ? boardColumns
                  : (["backlog", "todo", "in_progress", "done"] as string[])
          }
          filters={{
            cycleId: filters.cycleId,
            priority: filters.priority,
            search: filters.search,
            labelIds: groupLabelIds,
          }}
          groupBy={
            query.group === "priority" || query.group === "project"
              ? query.group
              : "status"
          }
          initialIssues={issues.map((i) => ({
            ...i,
            number: i.number,
            columnKey:
              query.group === "priority"
                ? i.priority
                : query.group === "project"
                  ? (i.projectId ?? "none")
                  : ("workflowStatusId" in i &&
                      typeof i.workflowStatusId === "string" &&
                      workflowById.get(i.workflowStatusId)) ||
                    statusToWorkflowKey(i.status),
            revision:
              "revision" in i ? (i as { revision?: number }).revision : 0,
          }))}
          slaHours={team.slaHours}
          slaWindow={{
            timezone: team.timezone,
            startHour: team.slaStartHour,
            endHour: team.slaEndHour,
            weekdays: team.slaWeekdays,
          }}
          teamId={team.id}
          teamName={team.name}
          teamSlug={teamSlug}
          workflows={workflows.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
          }))}
        />
      ) : (
        <IssuesListClient
          filters={{
            status: filters.status,
            priority: filters.priority,
            cycleId: filters.cycleId,
            search: filters.search,
            labelIds: groupLabelIds,
          }}
          initialCursor={listResult.nextCursor}
          initialIssues={listResult.issues.map((issue) => ({
            createdAt: issue.createdAt.toISOString(),
            id: issue.id,
            number: issue.number,
            title: issue.title,
            description: issue.description,
            status: issue.status,
            priority: issue.priority,
            assignee: issue.assignee,
            cycle: issue.cycle,
            labelIds: issue.labels.map((row) => row.labelId),
          }))}
          slaHours={team.slaHours}
          slaWindow={{
            timezone: team.timezone,
            startHour: team.slaStartHour,
            endHour: team.slaEndHour,
            weekdays: team.slaWeekdays,
          }}
          teamId={team.id}
          teamName={team.name}
          teamSlug={teamSlug}
          workflows={workflows.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
          }))}
        />
      )}
    </div>
  );
}

function SaveViewButton({
  teamId,
  filters,
}: {
  teamId: string;
  filters: Record<string, string | undefined>;
}) {
  async function saveView(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();

    if (!name) return;
    const filterJson: Record<string, string> = {};

    for (const [k, v] of Object.entries(filters)) {
      if (v) filterJson[k] = v;
    }
    await viewsService.createView(teamId, {
      name,
      filterJson,
      layout: "LIST",
      pinned: true,
    });
  }

  return <SaveViewForm action={saveView} />;
}
