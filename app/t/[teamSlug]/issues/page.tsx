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
import { WORKFLOW_KEY_TO_STATUS } from "@/lib/labels";

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
  }>;
}) {
  const { teamSlug } = await params;
  const query = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
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
  } = {
    status: query.status as IssueStatus | undefined,
    priority: query.priority as Priority | undefined,
    cycleId: query.cycleId,
    search: query.search,
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

  const [listResult, boardIssues, cycles, members, projects, labels, workflows] =
    await Promise.all([
      isBoard
        ? Promise.resolve({
            issues: [] as Awaited<
              ReturnType<typeof issuesService.listIssues>
            >["issues"],
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
    ]);

  const boardColumns = workflows
    .filter((w) => w.type !== "canceled")
    .map((w) => WORKFLOW_KEY_TO_STATUS[w.key])
    .filter((s): s is IssueStatus => Boolean(s));

  const projectOpts = projects.map((p) => ({ id: p.id, name: p.name }));
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
            </div>
            <CreateIssueForm
              cycles={cycleOpts}
              labels={labelOpts}
              members={memberOpts}
              projects={projectOpts}
              teamId={team.id}
              teamSlug={teamSlug}
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
              defaultValue={query.status ?? ""}
              name="status"
            >
              <option value="">All statuses</option>
              <option value="BACKLOG">Backlog</option>
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
              <option value="CANCELLED">Canceled</option>
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
              projects={projectOpts}
              teamId={team.id}
              teamSlug={teamSlug}
            />
          }
          description="Create your first issue or import from Linear in Settings → Import."
          title="No issues yet"
        />
      ) : isBoard ? (
        <BoardView
          columns={
            boardColumns.length
              ? boardColumns
              : (["BACKLOG", "TODO", "IN_PROGRESS", "DONE"] as IssueStatus[])
          }
          columnLabels={Object.fromEntries(
            workflows
              .map((w) => {
                const status = WORKFLOW_KEY_TO_STATUS[w.key];

                return status ? ([status, w.name] as const) : null;
              })
              .filter((entry): entry is readonly [IssueStatus, string] =>
                Boolean(entry),
              ),
          )}
          initialIssues={issues.map((i) => ({
            ...i,
            number: i.number,
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
          initialIssues={listResult.issues.map((issue) => ({
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
