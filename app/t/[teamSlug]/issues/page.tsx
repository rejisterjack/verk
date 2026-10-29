import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import { notFound, redirect } from "next/navigation";
import NextLink from "next/link";

import { BoardView } from "@/components/board-view";
import { CreateIssueForm } from "@/components/create-issue-form";
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
import { slaBreached } from "@/lib/sla";
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
  } = {
    status: query.status as IssueStatus | undefined,
    priority: query.priority as Priority | undefined,
    cycleId: query.cycleId,
    search: query.search,
    workflowStatusId: query.workflowStatusId,
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

  const [listResult, boardIssues, cycles, members, projects, labels, workflows, templates] =
    await Promise.all([
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
  }));
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
              <NextLink className="px-3 py-1.5 text-muted" href={`/t/${teamSlug}/issues?layout=board&group=priority`}>
                By priority
              </NextLink>
              <NextLink className="px-3 py-1.5 text-muted" href={`/t/${teamSlug}/issues?layout=board&group=project`}>
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

      {!isBoard ? (
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <form className="flex flex-wrap items-end gap-2" method="get">
            {mine ? <input name="assignee" type="hidden" value="me" /> : null}
            <input
              className="rounded-lg border border-separator bg-background px-3 py-2 text-sm"
              defaultValue={query.search}
              name="search"
              placeholder="Search…"
            />
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2 text-sm"
              defaultValue={query.workflowStatusId ?? ""}
              name="workflowStatusId"
            >
              <option value="">All workflow statuses</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2 text-sm"
              defaultValue={query.priority ?? ""}
              name="priority"
            >
              <option value="">All priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="NONE">No priority</option>
            </select>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2 text-sm"
              defaultValue={query.cycleId ?? ""}
              name="cycleId"
            >
              <option value="">All cycles</option>
              {activeCycle ? (
                <option value={activeCycle.id}>Active cycle</option>
              ) : null}
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground"
              type="submit"
            >
              Filter
            </button>
          </form>
          <SaveViewButton
            filters={{
              status: query.status,
              cycleId: query.cycleId,
              search: query.search,
              assigneeId: mine ? user.id : undefined,
            }}
            teamId={team.id}
          />
        </div>
      ) : null}

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
          groupBy={
            query.group === "priority" || query.group === "project"
              ? query.group
              : "status"
          }
          slaHours={team.slaHours}
          slaWindow={{
            timezone: team.timezone,
            startHour: team.slaStartHour,
            endHour: team.slaEndHour,
            weekdays: team.slaWeekdays,
          }}
          workflows={workflows.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
          }))}
          initialIssues={issues.map((i) => ({
            ...i,
            number: i.number,
            columnKey:
              query.group === "priority"
                ? i.priority
                : query.group === "project"
                  ? i.projectId ?? "none"
                  : ("workflowStatusId" in i &&
                    typeof i.workflowStatusId === "string" &&
                    workflowById.get(i.workflowStatusId)) ||
                    statusToWorkflowKey(i.status),
            revision:
              "revision" in i ? (i as { revision?: number }).revision : 0,
          }))}
          teamId={team.id}
          teamName={team.name}
          teamSlug={teamSlug}
        />
      ) : (
        <IssuesListClient
          filters={{
            status: filters.status,
            priority: filters.priority,
            cycleId: filters.cycleId,
            search: filters.search,
          }}
          initialCursor={listResult.nextCursor}
          slaHours={team.slaHours}
          slaWindow={{
            timezone: team.timezone,
            startHour: team.slaStartHour,
            endHour: team.slaEndHour,
            weekdays: team.slaWeekdays,
          }}
          workflows={workflows.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
          }))}
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
          }))}
          teamId={team.id}
          teamName={team.name}
          teamSlug={teamSlug}
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

  return (
    <form action={saveView} className="flex gap-1">
      <input
        className="w-36 rounded-lg border border-separator bg-background px-2 py-2 text-sm"
        name="name"
        placeholder="Save as view…"
      />
      <button
        className="rounded-lg border border-separator px-2 py-2 text-xs text-muted hover:text-foreground"
        type="submit"
      >
        Save
      </button>
    </form>
  );
}
