"use client";

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { IssuePeek } from "@/components/app/issue-peek";
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
  description?: string;
  status: IssueStatus;
  priority: Priority;
  assignee?: { name: string | null; email: string } | null;
  cycle?: { name: string } | null;
  syncStatus?: string;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;

  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

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
  const router = useRouter();
  const [issues, setIssues] = useState(initialIssues);
  const [focusIndex, setFocusIndex] = useState(0);
  const [peekOpen, setPeekOpen] = useState(false);

  useEffect(() => {
    setIssues(initialIssues);
    setFocusIndex(0);
  }, [initialIssues]);

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
            description: r.description,
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!issues.length) return;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(issues.length - 1, i + 1));
        setPeekOpen(false);
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(0, i - 1));
        setPeekOpen(false);
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setPeekOpen((open) => !open);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const issue = issues[focusIndex];

        if (!issue) return;
        const href =
          issue.number != null
            ? `/t/${teamSlug}/issues/${issue.number}`
            : `/t/${teamSlug}/issues/tmp/${issue.id}`;

        router.push(href);
      } else if (e.key === "Escape") {
        setPeekOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [issues, focusIndex, teamSlug, router]);

  if (issues.length === 0) return null;

  const focused = issues[Math.min(focusIndex, issues.length - 1)] ?? null;

  return (
    <>
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
            {issues.map((issue, index) => {
              const href =
                issue.number != null
                  ? `/t/${teamSlug}/issues/${issue.number}`
                  : `/t/${teamSlug}/issues/tmp/${issue.id}`;
              const focusedRow = index === focusIndex;

              return (
                <tr
                  key={issue.id}
                  className={`border-b border-separator last:border-0 hover:bg-default/40 ${
                    focusedRow ? "bg-accent/10" : ""
                  }`}
                  onClick={() => setFocusIndex(index)}
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
      {peekOpen ? (
        <IssuePeek
          issue={focused}
          teamSlug={teamSlug}
          onClose={() => setPeekOpen(false)}
        />
      ) : null}
    </>
  );
}
