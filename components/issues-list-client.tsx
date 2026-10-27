"use client";

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import NextLink from "next/link";
import { useEffect, useState } from "react";

import { PriorityChip, StatusChip } from "@/components/status-chip";
import { isOfflineEnabled } from "@/lib/offline/feature";
import {
  hydrateIssuesFromServer,
  listLocalIssues,
  pullDelta,
  subscribeIssues,
  upsertTeam,
  type ServerIssue,
} from "@/lib/offline/issue-repository";
import { issueKey } from "@/lib/utils";

type ListIssue = {
  id: string;
  number: number | null;
  title: string;
  status: IssueStatus;
  priority: Priority;
  assignee?: { name: string | null; email: string } | null;
  cycle?: { name: string } | null;
  syncStatus?: string;
};

export function IssuesListClient({
  teamId,
  teamSlug,
  teamName,
  initialIssues,
  filters,
}: {
  teamId: string;
  teamSlug: string;
  teamName: string;
  initialIssues: ListIssue[];
  filters?: {
    status?: string;
    priority?: string;
    cycleId?: string;
    search?: string;
  };
}) {
  const [issues, setIssues] = useState(initialIssues);

  useEffect(() => {
    if (!isOfflineEnabled()) return;

    void upsertTeam({ id: teamId, slug: teamSlug, name: teamName });
    void hydrateIssuesFromServer(
      teamId,
      initialIssues.map(
        (i) =>
          ({
            id: i.id,
            number: i.number ?? 0,
            title: i.title,
            status: i.status,
            priority: i.priority,
            order: 0,
            teamId,
            assignee: i.assignee
              ? {
                  id: "",
                  name: i.assignee.name,
                  email: i.assignee.email,
                  image: null,
                }
              : null,
          }) as ServerIssue,
      ),
    );

    const refresh = () => {
      void listLocalIssues(teamId, filters).then((rows) => {
        setIssues(
          rows.map((r) => ({
            id: r.id,
            number: r.number,
            title: r.title,
            status: r.status as IssueStatus,
            priority: r.priority as Priority,
            assignee: r.assignee,
            cycle: r.cycleId ? { name: "" } : null,
            syncStatus: r.syncStatus,
          })),
        );
      });
    };

    const unsub = subscribeIssues(refresh);

    refresh();
    void pullDelta(teamId);

    return unsub;
  }, [teamId, teamSlug, teamName, initialIssues, filters]);

  if (issues.length === 0) return null;

  return (
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
          {issues.map((issue) => {
            const href =
              issue.number != null
                ? `/t/${teamSlug}/issues/${issue.number}`
                : `/t/${teamSlug}/issues/tmp/${issue.id}`;

            return (
              <tr
                key={issue.id}
                className="border-b border-separator last:border-0 hover:bg-default/40"
              >
                <td className="px-4 py-3 text-muted whitespace-nowrap">
                  <NextLink className="hover:text-accent" href={href}>
                    {issueKey(teamSlug, issue.number)}
                  </NextLink>
                </td>
                <td className="px-4 py-3">
                  <NextLink
                    className="font-medium hover:text-accent"
                    href={href}
                  >
                    {issue.title}
                    {issue.syncStatus === "pending" ? (
                      <span className="ml-2 text-xs text-muted">syncing</span>
                    ) : null}
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
                  {issue.cycle?.name || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
