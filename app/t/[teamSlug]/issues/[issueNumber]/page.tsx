import { Button } from "@heroui/react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { deleteIssueAction, updateIssueAction } from "@/lib/actions/issues";
import { issueKey } from "@/lib/utils";
import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";
import * as cyclesService from "@/lib/services/cycles";
import * as membersService from "@/lib/services/members";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";

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
    <div className="max-w-3xl">
      <PageHeader
        description={issueKey(team.slug, issue.number)}
        title={issue.title}
      />

      <form
        action={async (formData) => {
          "use server";
          await updateIssueAction(teamSlug, issueNumber, formData);
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Title</span>
          <input
            required
            className="rounded-lg border border-separator bg-background px-3 py-2"
            defaultValue={issue.title}
            name="title"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Description</span>
          <textarea
            className="min-h-40 rounded-lg border border-separator bg-background px-3 py-2"
            defaultValue={issue.description}
            name="description"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Status</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.status}
              name="status"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Priority</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.priority}
              name="priority"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Assignee</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.assigneeId ?? ""}
              name="assigneeId"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name ?? m.user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Cycle</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.cycleId ?? ""}
              name="cycleId"
            >
              <option value="">No cycle</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit">Save changes</Button>
        </div>
      </form>

      {canDelete ? (
        <form
          action={async () => {
            "use server";
            await deleteIssueAction(teamSlug, issueNumber);
          }}
          className="mt-8 border-t border-separator pt-6"
        >
          <Button type="submit" variant="danger">
            Delete issue
          </Button>
        </form>
      ) : null}
    </div>
  );
}
