"use client";

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import { Button, Link } from "@heroui/react";
import NextLink from "next/link";

import { MarkdownBody } from "@/components/markdown-body";
import { PriorityChip, StatusChip } from "@/components/status-chip";
import { SelectField } from "@/components/ui/select-field";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
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
        <Button size="sm" variant="ghost" onPress={onClose}>
          Esc
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <h2 className="text-lg font-semibold leading-snug">{issue.title}</h2>
        <div className="mt-3 flex gap-2">
          <StatusChip status={issue.status} />
          <PriorityChip priority={issue.priority} />
        </div>
        {teamId ? (
          <div className="mt-3 flex flex-col gap-3">
            <SelectField
              defaultValue={
                workflows.length
                  ? (workflows[0]?.id ?? issue.status)
                  : issue.status
              }
              label="Status"
              options={
                workflows.length
                  ? workflows.map((workflow) => ({
                      id: workflow.id,
                      label: workflow.name,
                    }))
                  : Object.entries(STATUS_LABELS).map(([id, label]) => ({
                      id,
                      label,
                    }))
              }
              onChange={(key) => {
                if (key == null) return;
                const value = String(key);

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
            />
            <SelectField
              defaultValue={issue.priority}
              label="Priority"
              options={Object.entries(PRIORITY_LABELS).map(([id, label]) => ({
                id,
                label,
              }))}
              onChange={(key) => {
                if (key == null) return;
                void fetch(`/api/teams/${teamId}/issues/${issue.id}`, {
                  method: "PATCH",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ priority: String(key) }),
                });
              }}
            />
          </div>
        ) : null}
        <div className="mt-4">
          <MarkdownBody text={issue.description || ""} />
        </div>
      </div>
      <div className="border-t border-separator p-4">
        <Link
          render={(domProps) => (
            <NextLink
              {...domProps}
              ref={domProps.ref as React.Ref<HTMLAnchorElement>}
              href={href}
            />
          )}
        >
          Open full issue
        </Link>
      </div>
    </div>
  );
}
