import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import NextLink from "next/link";
import { notFound } from "next/navigation";

import { CreateIssueForm } from "@/components/create-issue-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PriorityChip, StatusChip } from "@/components/status-chip";
import { issueKey } from "@/lib/utils";
import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";
import * as cyclesService from "@/lib/services/cycles";
import * as membersService from "@/lib/services/members";

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
  const { team } = teamCtx;

  const [{ issues }, cycles, members] = await Promise.all([
    issuesService.listIssues(team.id, {
      status: query.status as IssueStatus | undefined,
      priority: query.priority as Priority | undefined,
      cycleId: query.cycleId,
      search: query.search,
      take: 100,
    }),
    cyclesService.listCycles(team.id),
    membersService.listMembers(team.id),
  ]);

  return (
    <div>
      <PageHeader
        actions={
          <CreateIssueForm
            cycles={cycles.map((c) => ({ id: c.id, name: c.name }))}
            members={members.map((m) => m.user)}
            teamSlug={teamSlug}
          />
        }
        description="List view — press New issue or open the board for kanban."
        title="Issues"
      />

      <form className="mb-4 flex flex-wrap gap-2" method="get">
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
          <option value="CANCELLED">Cancelled</option>
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
          <option value="NONE">None</option>
        </select>
        <select
          className="rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          defaultValue={query.cycleId ?? ""}
          name="cycleId"
        >
          <option value="">All cycles</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isActive ? " (active)" : ""}
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

      {issues.length === 0 ? (
        <EmptyState
          action={
            <CreateIssueForm
              cycles={cycles.map((c) => ({ id: c.id, name: c.name }))}
              members={members.map((m) => m.user)}
              teamSlug={teamSlug}
            />
          }
          description="Create your first issue to start tracking work."
          title="No issues yet"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-separator">
          <table className="w-full text-sm">
            <thead className="border-b border-separator bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Cycle</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr
                  key={issue.id}
                  className="border-b border-separator last:border-0 hover:bg-default/40"
                >
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    <NextLink
                      className="hover:text-accent"
                      href={`/t/${teamSlug}/issues/${issue.number}`}
                    >
                      {issueKey(team.slug, issue.number)}
                    </NextLink>
                  </td>
                  <td className="px-4 py-3">
                    <NextLink
                      className="font-medium hover:text-accent"
                      href={`/t/${teamSlug}/issues/${issue.number}`}
                    >
                      {issue.title}
                    </NextLink>
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={issue.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityChip priority={issue.priority} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {issue.assignee?.name ?? issue.assignee?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {issue.cycle?.name ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
