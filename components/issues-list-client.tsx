"use client";

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { IssuePeek } from "@/components/app/issue-peek";
import {
  QuickPicker,
  type QuickPickerOption,
} from "@/components/app/quick-picker";
import { PriorityChip, StatusChip } from "@/components/status-chip";
import { bulkIssuesAction } from "@/lib/actions/issues";
import { useT } from "@/components/locale-provider";
import { type GroupBy, orderForDisplay, type SortBy } from "@/lib/list-display";
import { isOfflineEnabled } from "@/lib/offline/feature";
import { chord } from "@/lib/shortcuts/registry";
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
  projectId?: string | null;
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

const BULK_STATUSES = [
  ["BACKLOG", "Backlog"],
  ["TODO", "Todo"],
  ["IN_PROGRESS", "In progress"],
  ["DONE", "Done"],
  ["CANCELLED", "Cancelled"],
] as const;
const BULK_PRIORITIES = [
  ["URGENT", "Urgent"],
  ["HIGH", "High"],
  ["MEDIUM", "Medium"],
  ["LOW", "Low"],
  ["NONE", "No priority"],
] as const;

const bulkSelectClass =
  "h-7 rounded-md border border-separator bg-surface px-2 text-[12px] text-foreground";

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
  archived = false,
  readOnly = false,
  members = [],
  canBulkDelete = false,
  groupBy = "none",
  sortBy = "manual",
  projectNames = {},
}: {
  /** Group headers and sort order for the loaded rows (kept in the URL). */
  groupBy?: GroupBy;
  sortBy?: SortBy;
  projectNames?: Record<string, string>;
  /** Showing the archive: no offline cache, restore instead of archive. */
  archived?: boolean;
  readOnly?: boolean;
  members?: { id: string; name: string | null; email: string }[];
  canBulkDelete?: boolean;
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
  const [rawIssues, setIssues] = useState(() => uniqueIssues(initialIssues));
  // Everything below (focus, selection ranges, J/K) works on this ordered list, so grouping and
  // sorting never desync the keyboard from what is on screen.
  const { rows: issues, groups } = useMemo(
    () => orderForDisplay(rawIssues, groupBy, sortBy, projectNames),
    [rawIssues, groupBy, sortBy, projectNames],
  );
  const groupAt = useMemo(
    () => new Map(groups.map((group) => [group.start, group])),
    [groups],
  );

  const { t } = useT();

  function groupTitle(key: string): string {
    if (key === "") {
      return groupBy === "assignee"
        ? t("group.unassigned")
        : groupBy === "project"
          ? t("group.noProject")
          : t("group.noCycle");
    }
    if (groupBy === "status") return t(`status.${key as IssueStatus}`);
    if (groupBy === "priority") return t(`priority.${key as Priority}`);
    if (groupBy === "project") return projectNames[key] ?? key;

    return key;
  }
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [peekOpen, setPeekOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [picker, setPicker] = useState<
    "status" | "priority" | "assignee" | null
  >(null);

  useEffect(() => {
    setIssues(uniqueIssues(initialIssues));
    setFocusIndex(0);
    setSelected(new Set());
    setLastClicked(null);
  }, [initialIssues]);

  function toggleSelect(index: number, shift: boolean) {
    const row = issues[index];

    if (!row) return;
    setSelected((prev) => {
      const next = new Set(prev);

      if (shift && lastClicked != null) {
        const [from, to] = [lastClicked, index].sort((a, b) => a - b) as [
          number,
          number,
        ];
        const turnOn = !prev.has(row.id);

        for (let i = from; i <= to; i += 1) {
          const id = issues[i]?.id;

          if (!id) continue;
          if (turnOn) next.add(id);
          else next.delete(id);
        }
      } else if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        next.add(row.id);
      }

      return next;
    });
    setLastClicked(index);
  }

  async function runBulk(
    action: "update" | "archive" | "restore" | "delete",
    patch?: Record<string, unknown>,
    idsOverride?: string[],
  ) {
    const ids = idsOverride ?? [...selected];

    if (!ids.length || bulkPending) return;
    if (
      action === "delete" &&
      !window.confirm(
        `Permanently delete ${ids.length} issue${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkPending(true);
    setBulkMessage(null);
    const result = await bulkIssuesAction(teamSlug, { ids, action, patch });

    setBulkPending(false);
    if ("error" in result && result.error) {
      setBulkMessage(result.error);

      return;
    }
    const ok = new Set<string>("ok" in result ? (result.ok ?? []) : []);
    const failed: { id: string; error: string }[] =
      "failed" in result ? (result.failed ?? []) : [];

    if (action === "update") {
      // Keep the rows, apply the visible fields locally; the refresh below reconciles.
      setIssues((curr) =>
        curr.map((row) =>
          ok.has(row.id)
            ? {
                ...row,
                ...(typeof patch?.status === "string"
                  ? { status: patch.status as IssueStatus }
                  : {}),
                ...(typeof patch?.priority === "string"
                  ? { priority: patch.priority as Priority }
                  : {}),
                ...(typeof patch?.workflowStatusId === "string"
                  ? { workflowStatusId: patch.workflowStatusId }
                  : {}),
              }
            : row,
        ),
      );
    } else {
      setIssues((curr) => curr.filter((row) => !ok.has(row.id)));
    }
    setSelected(new Set(failed.map((f) => f.id)));
    setBulkMessage(
      failed.length
        ? `${ok.size} done, ${failed.length} failed: ${failed[0]!.error}`
        : `${ok.size} issue${ok.size === 1 ? "" : "s"} updated`,
    );
    router.refresh();
  }

  useEffect(() => {
    // The offline cache only holds live issues. Never let it overwrite the archive list.
    if (archived || !isOfflineEnabled()) return;

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
  }, [teamId, teamSlug, teamName, initialIssues, filters, archived]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // `G then S` is navigation, not "set status": leave the key to the shell.
      if (chord.goArmed || e.defaultPrevented) return;
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
      } else if (e.key === "x" || e.key === "X") {
        if (readOnly) return;
        e.preventDefault();
        toggleSelect(focusIndex, false);
      } else if (
        !readOnly &&
        !archived &&
        (e.key === "s" || e.key === "p" || e.key === "a")
      ) {
        // S / P / A open a type-to-filter picker for the selected rows, or the focused one.
        e.preventDefault();
        setPicker(
          e.key === "s" ? "status" : e.key === "p" ? "priority" : "assignee",
        );
      } else if (e.key === "Escape") {
        setPeekOpen(false);
        setSelected(new Set());
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [issues, focusIndex, teamSlug, router, readOnly, lastClicked, archived]);

  if (issues.length === 0) return null;

  /** Rows a keyboard action applies to: the selection, else the focused row. */
  function targetIds(): string[] {
    if (selected.size) return [...selected];
    const row = issues[Math.min(focusIndex, issues.length - 1)];

    return row && row.number != null ? [row.id] : [];
  }

  function pickerOptions(): { title: string; options: QuickPickerOption[] } {
    if (picker === "status") {
      return {
        title: "Set status…",
        options: workflows.length
          ? workflows.map((w) => ({ value: w.id, label: w.name }))
          : BULK_STATUSES.map(([value, label]) => ({ value, label })),
      };
    }
    if (picker === "priority") {
      return {
        title: "Set priority…",
        options: BULK_PRIORITIES.map(([value, label]) => ({ value, label })),
      };
    }

    return {
      title: "Assign to…",
      options: [
        { value: "", label: "Unassigned" },
        ...members.map((m) => ({
          value: m.id,
          label: m.name ?? m.email,
          hint: m.name ? m.email : undefined,
        })),
      ],
    };
  }

  function onPick(value: string) {
    const ids = targetIds();
    const kind = picker;

    setPicker(null);
    if (!ids.length || !kind) return;
    if (kind === "status") {
      void runBulk(
        "update",
        workflows.length ? { workflowStatusId: value } : { status: value },
        ids,
      );
    } else if (kind === "priority") {
      void runBulk("update", { priority: value }, ids);
    } else {
      void runBulk("update", { assigneeId: value || null }, ids);
    }
  }

  const focused = issues[Math.min(focusIndex, issues.length - 1)] ?? null;

  const allSelected = selected.size === issues.length && issues.length > 0;

  const pickerConfig = picker ? pickerOptions() : null;

  return (
    <>
      {pickerConfig ? (
        <QuickPicker
          options={pickerConfig.options}
          title={pickerConfig.title}
          onClose={() => setPicker(null)}
          onPick={onPick}
        />
      ) : null}
      {selected.size > 0 && !readOnly ? (
        <div
          aria-label="Bulk actions"
          className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-separator bg-surface px-4 py-2 text-[12px]"
          role="toolbar"
        >
          <span className="font-medium text-foreground">
            {selected.size} selected
          </span>
          <button
            className="text-muted hover:text-foreground"
            type="button"
            onClick={() =>
              setSelected(
                allSelected ? new Set() : new Set(issues.map((row) => row.id)),
              )
            }
          >
            {allSelected ? "Clear" : "Select all"}
          </button>
          {!archived ? (
            <>
              <select
                aria-label="Set status"
                className={bulkSelectClass}
                disabled={bulkPending}
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    void runBulk("update", { status: e.target.value });
                }}
              >
                <option value="">Status…</option>
                {BULK_STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Set priority"
                className={bulkSelectClass}
                disabled={bulkPending}
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    void runBulk("update", { priority: e.target.value });
                }}
              >
                <option value="">Priority…</option>
                {BULK_PRIORITIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {members.length ? (
                <select
                  aria-label="Set assignee"
                  className={bulkSelectClass}
                  disabled={bulkPending}
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    void runBulk("update", {
                      assigneeId:
                        e.target.value === "__none" ? null : e.target.value,
                    });
                  }}
                >
                  <option value="">Assignee…</option>
                  <option value="__none">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name ?? member.email}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                className="rounded-md border border-separator px-2 py-1 text-foreground hover:bg-default"
                disabled={bulkPending}
                type="button"
                onClick={() => void runBulk("archive")}
              >
                Archive
              </button>
            </>
          ) : (
            <button
              className="rounded-md border border-separator px-2 py-1 text-foreground hover:bg-default"
              disabled={bulkPending}
              type="button"
              onClick={() => void runBulk("restore")}
            >
              Restore
            </button>
          )}
          {canBulkDelete ? (
            <button
              className="rounded-md border border-danger/40 px-2 py-1 text-danger hover:bg-danger/10"
              disabled={bulkPending}
              type="button"
              onClick={() => void runBulk("delete")}
            >
              Delete
            </button>
          ) : null}
          {bulkPending ? <span className="text-muted">Working…</span> : null}
        </div>
      ) : null}
      {bulkMessage ? (
        <p
          className="border-b border-separator px-4 py-1.5 text-[12px] text-muted"
          role="status"
        >
          {bulkMessage}
        </p>
      ) : null}
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

          const header = groupAt.get(index);

          return (
            <div key={issue.id} className="contents">
              {header ? (
                <div
                  className="flex items-center gap-2 bg-default/40 px-4 py-1 text-[12px] font-medium text-muted"
                  role="presentation"
                >
                  {groupTitle(header.key)}
                  <span className="font-normal">{header.count}</span>
                </div>
              ) : null}
              <div
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
                {!readOnly ? (
                  <input
                    aria-label={`Select ${issueKey(teamSlug, issue.number)}`}
                    checked={selected.has(issue.id)}
                    className={`h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--accent)] ${
                      selected.size > 0
                        ? ""
                        : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                    }`}
                    type="checkbox"
                    onChange={() => undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(index, e.shiftKey);
                    }}
                  />
                ) : null}
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
            if (archived) params.set("archived", "true");
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
