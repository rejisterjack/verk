"use client";

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import NextLink from "next/link";

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
  onClose,
}: {
  issue: PeekIssue | null;
  teamSlug: string;
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
        <p className="mt-4 whitespace-pre-wrap text-sm text-muted">
          {issue.description || "No description"}
        </p>
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
