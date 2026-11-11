"use client";

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import { Button, Link } from "@heroui/react";
import NextLink from "next/link";

import { MarkdownBody } from "@/components/markdown-body";
import { SelectField } from "@/components/ui/select-field";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  statusToWorkflowKey,
} from "@/lib/labels";
import { issueKey } from "@/lib/utils";

export type PeekIssue = {
  id: string;
  number: number | null;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: Priority;
  workflowStatusId?: string | null;
};

type PeekWorkflow = { id: string; name: string; key?: string };

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
  workflows?: PeekWorkflow[];
  onClose: () => void;
}) {
  if (!issue) return null;

  const href =
    issue.number != null
      ? `/t/${teamSlug}/issues/${issue.number}`
      : `/t/${teamSlug}/issues/tmp/${issue.id}`;

  const statusDefault = (() => {
    if (!workflows.length) return issue.status;
    if (
      issue.workflowStatusId &&
      workflows.some((workflow) => workflow.id === issue.workflowStatusId)
    ) {
      return issue.workflowStatusId;
    }
    const key = statusToWorkflowKey(issue.status);

    return (
      workflows.find((workflow) => workflow.key === key)?.id ??
      workflows[0]?.id ??
      issue.status
    );
  })();

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl border-l border-separator bg-background shadow-xl animate-in slide-in-from-right duration-150">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 items-center justify-between border-b border-separator px-4">
          <span className="font-mono text-[12px] text-muted">
            {issueKey(teamSlug, issue.number)}
          </span>
          <Button size="sm" variant="ghost" onPress={onClose}>
            Esc
          </Button>
        </div>
        <div className="flex-1 overflow-auto px-4 py-4">
          <h2 className="text-[17px] font-semibold leading-snug tracking-tight">
            {issue.title}
          </h2>
          <div className="mt-4 text-[13px] text-foreground/90">
            <MarkdownBody text={issue.description || ""} />
          </div>
        </div>
        <div className="border-t border-separator px-4 py-3">
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
      {teamId ? (
        <aside className="w-52 shrink-0 border-l border-separator bg-surface/40 px-3 py-3">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">
            Properties
          </p>
          <div className="flex flex-col gap-3">
            <SelectField
              defaultValue={statusDefault}
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
              size="sm"
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
              size="sm"
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
        </aside>
      ) : null}
    </div>
  );
}
