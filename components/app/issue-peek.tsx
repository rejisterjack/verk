"use client";

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import NextLink from "next/link";

import { MarkdownBody } from "@/components/markdown-body";
import { PriorityChip, StatusChip } from "@/components/status-chip";
import { issueKey } from "@/lib/utils";

export type PeekIssue = {
  id: string;
  number: number | null;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: Priority;
};

export function IssuePeek({
  issue,
  teamSlug,
  teamId,
  workflows = [],
  onClose,
}: {
  issue: PeekIssue | null;
  teamSlug: string;
  teamId?: string;
  workflows?: { id: string; name: string }[];
  onClose: () => void;
}) {
  if (!issue) return null;

  const href =
    issue.number != null
      ? `/t/${teamSlug}/issues/${issue.number}`
      : `/t/${teamSlug}/issues/tmp/${issue.id}`;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-separator bg-background shadow-xl animate-in slide-in-from-right duration-150">
      <div className="flex items-center justify-between border-b border-separator px-4 py-3">
        <span className="text-xs text-muted">
          {issueKey(teamSlug, issue.number)}
        </span>
        <button
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-default"
          type="button"
          onClick={onClose}
        >
          Esc
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <h2 className="text-lg font-semibold leading-snug">{issue.title}</h2>
        <div className="mt-3 flex gap-2">
          <StatusChip status={issue.status} />
          <PriorityChip priority={issue.priority} />
        </div>
        {teamId ? (
          <div>
          <label className="mt-3 block text-xs text-muted">
            Status
            <select
              className="mt-1 w-full rounded-lg border border-separator bg-background px-2 py-1 text-sm text-foreground"
              defaultValue={issue.status}
              onChange={(event) => {
                const value = event.target.value;
                void fetch(`/api/teams/${teamId}/issues/${issue.id}`, {
                  method: "PATCH",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(
                    workflows.length
                      ? { workflowStatusId: value }
                      : { status: value },
                  ),
                });
              }}
            >
              {workflows.length
                ? workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))
                : (
                  <>
                    <option value="BACKLOG">Backlog</option>
                    <option value="TODO">Todo</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="DONE">Done</option>
                    <option value="CANCELLED">Canceled</option>
                  </>
                )}
            </select>
          </label>
          <label className="mt-2 block text-xs text-muted">
            Priority
            <select
              className="mt-1 w-full rounded-lg border border-separator bg-background px-2 py-1 text-sm text-foreground"
              defaultValue={issue.priority}
              onChange={(event) => {
                void fetch(`/api/teams/${teamId}/issues/${issue.id}`, {
                  method: "PATCH",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ priority: event.target.value }),
                });
              }}
            >
              <option value="NONE">No priority</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </label>
          </div>
        ) : null}
        <div className="mt-4">
          <MarkdownBody text={issue.description || ""} />
        </div>
      </div>
      <div className="border-t border-separator p-4">
        <NextLink
          className="inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
          href={href}
        >
          Open full issue
        </NextLink>
      </div>
    </div>
  );
}
