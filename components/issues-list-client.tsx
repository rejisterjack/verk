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
import { slaBreached, type SlaWindow } from "@/lib/sla";
import { issueKey } from "@/lib/utils";

type ListIssue = {
  id: string;
  number: number | null;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: Priority;
  workflowStatusId?: string | null;
  assignee?: { name: string | null; email: string } | null;
  cycle?: { name: string } | null;
  createdAt?: string;
  syncStatus?: string;
  labelIds?: string[];
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

function uniqueIssues(rows: ListIssue[]) {
  const seenIds = new Set<string>();
  const seenNumbers = new Set<number>();

  return rows.filter((row) => {
    if (seenIds.has(row.id)) return false;
    if (row.number != null && seenNumbers.has(row.number)) return false;
    seenIds.add(row.id);
    if (row.number != null) seenNumbers.add(row.number);

    return true;
  });
}

export function IssuesListClient({
  teamId,
  teamSlug,
  teamName,
  initialIssues,
  filters,
  initialCursor,
  slaHours,
  slaWindow,
  workflows = [],
}: {
  teamId: string;
  teamSlug: string;
  teamName: string;
  initialIssues: ListIssue[];
  initialCursor?: string;
  slaHours?: unknown;
  slaWindow?: SlaWindow;
  workflows?: { id: string; name: string; key?: string }[];
  filters?: {
    status?: string;
    priority?: string;
    cycleId?: string;
    search?: string;
    labelIds?: string[];
  };
}) {
  const router = useRouter();
  const [issues, setIssues] = useState(() => uniqueIssues(initialIssues));
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [peekOpen, setPeekOpen] = useState(false);

  useEffect(() => {
    setIssues(uniqueIssues(initialIssues));
    setFocusIndex(0);
  }, [initialIssues]);

  useEffect(() => {
    if (!isOfflineEnabled()) return;

    void upsertTeam({ id: teamId, slug: teamSlug, name: teamName });
    let cancelled = false;
    const refresh = () => {
      void listLocalIssues(teamId, filters).then((rows) => {
        setIssues(
          uniqueIssues(
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
          ),
        );
      });
    };

    const unsub = subscribeIssues(refresh);

    void (async () => {
      await hydrateIssuesFromServer(
        teamId,
        initialIssues.map(
          (issue) =>
            ({
              id: issue.id,
              number: issue.number ?? 0,
              title: issue.title,
              status: issue.status,
              priority: issue.priority,
              order: 0,
              teamId,
              labels: (issue.labelIds ?? []).map((id) => ({ labelId: id })),
              assignee: issue.assignee
                ? {
                    id: "",
                    name: issue.assignee.name,
                    email: issue.assignee.email,
                    image: null,
                  }
                : null,
            }) as ServerIssue,
        ),
      );
      if (!cancelled) refresh();
    })();
    void pullDelta(teamId);

    return () => {
      cancelled = true;
      unsub();
    };
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
      <div className="divide-y divide-separator border-b border-separator">
        {issues.map((issue, index) => {
          const href =
            issue.number != null
              ? `/t/${teamSlug}/issues/${issue.number}`
              : `/t/${teamSlug}/issues/tmp/${issue.id}`;
          const focusedRow = index === focusIndex;
          const breached =
            issue.createdAt &&
            slaBreached(
              issue.priority,
              issue.status,
              new Date(issue.createdAt),
              slaHours,
              new Date(),
              slaWindow,
            );

          return (
            <div
              key={issue.id}
              aria-selected={focusedRow}
              className={`group flex h-[var(--row-h)] min-h-[var(--row-h)] cursor-default items-center gap-3 px-4 text-[13px] hover:bg-default/50 ${
                focusedRow ? "bg-accent/10" : ""
              }`}
              role="row"
              tabIndex={focusedRow ? 0 : -1}
              onClick={() => setFocusIndex(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFocusIndex(index);
                }
              }}
            >
              <div className="hidden w-[6.5rem] shrink-0 sm:block">
                <PriorityChip quiet priority={issue.priority} />
              </div>
              <NextLink
                className="w-14 shrink-0 truncate font-mono text-[11px] text-muted hover:text-accent"
                href={href}
              >
                {issueKey(teamSlug, issue.number)}
              </NextLink>
              <div className="hidden w-28 shrink-0 md:block">
                <StatusChip quiet status={issue.status} />
              </div>
              <NextLink
                className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-accent"
                href={href}
              >
                {issue.title}
                {issue.syncStatus === "pending" ? (
                  <span className="ml-2 text-[11px] font-normal text-muted">
                    syncing
                  </span>
                ) : null}
              </NextLink>
              <span className="hidden w-28 shrink-0 truncate text-[12px] text-muted lg:block">
                {issue.assignee?.name ?? issue.assignee?.email ?? "—"}
              </span>
              <span className="hidden w-24 shrink-0 truncate text-[12px] text-muted xl:block">
                {issue.cycle?.name || "—"}
                {breached ? (
                  <span className="ml-1 text-[11px] text-danger">SLA</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      {cursor ? (
        <button
          className="m-3 rounded-md border border-separator px-3 py-1.5 text-[13px] text-muted hover:bg-default hover:text-foreground"
          disabled={loadingMore}
          type="button"
          onClick={() => {
            setLoadingMore(true);
            const params = new URLSearchParams();

            if (filters?.status) params.set("status", filters.status);
            if (filters?.priority) params.set("priority", filters.priority);
            if (filters?.cycleId) params.set("cycleId", filters.cycleId);
            if (filters?.search) params.set("search", filters.search);
            params.set("cursor", cursor);
            params.set("take", "100");
            void fetch(`/api/teams/${teamId}/issues?${params}`, {
              credentials: "same-origin",
            })
              .then((res) => res.json())
              .then((data) => {
                const next = (data.issues ?? []) as ListIssue[];

                setIssues((curr) => [...curr, ...next]);
                setCursor(data.nextCursor);
              })
              .finally(() => setLoadingMore(false));
          }}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
      {peekOpen ? (
        <IssuePeek
          issue={focused}
          teamId={teamId}
          teamSlug={teamSlug}
          workflows={workflows}
          onClose={() => setPeekOpen(false)}
        />
      ) : null}
    </>
  );
}
