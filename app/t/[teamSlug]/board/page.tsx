import type { Priority } from "@/lib/generated/prisma/client";

import { notFound } from "next/navigation";

import { BoardView } from "@/components/board-view";
import { CreateIssueForm } from "@/components/create-issue-form";
import { PageHeader } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";
import * as cyclesService from "@/lib/services/cycles";
import * as membersService from "@/lib/services/members";

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{
    cycleId?: string;
    priority?: string;
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

  const [issues, cycles, members] = await Promise.all([
    issuesService.getBoardIssues(teamCtx.team.id, {
      cycleId: query.cycleId,
      priority: query.priority as Priority | undefined,
      search: query.search,
    }),
    cyclesService.listCycles(teamCtx.team.id),
    membersService.listMembers(teamCtx.team.id),
  ]);

  const activeCycle = cycles.find((c) => c.isActive);

  return (
    <div>
      <PageHeader
        actions={
          <CreateIssueForm
            cycles={cycles.map((c) => ({ id: c.id, name: c.name }))}
            members={members.map((m) => m.user)}
            teamId={teamCtx.team.id}
            teamSlug={teamSlug}
          />
        }
        description={
          activeCycle
            ? `Board view · Active cycle: ${activeCycle.name}`
            : "Drag cards between columns to update status"
        }
        title="Board"
      />

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <select
          className="rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          defaultValue={query.cycleId ?? ""}
          name="cycleId"
        >
          <option value="">All cycles</option>
          {activeCycle ? (
            <option value={activeCycle.id}>Current cycle</option>
          ) : null}
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          defaultValue={query.search}
          name="search"
          placeholder="Search…"
        />
        <button
          className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground"
          type="submit"
        >
          Filter
        </button>
      </form>

      <BoardView
        initialIssues={issues.map((i) => ({
          ...i,
          number: i.number,
          revision: i.revision,
        }))}
        teamId={teamCtx.team.id}
        teamName={teamCtx.team.name}
        teamSlug={teamSlug}
      />
    </div>
  );
}
