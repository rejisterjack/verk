"use client";

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";
import type { LocalIssue } from "@/lib/offline/db";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { IssuePeek } from "@/components/app/issue-peek";
import { ConflictModal } from "@/components/pwa/conflict-modal";
import { PriorityChip } from "@/components/status-chip";
import {
  BOARD_COLUMNS,
  STATUS_LABELS,
  statusToWorkflowKey,
} from "@/lib/labels";
import { slaBreached, type SlaWindow } from "@/lib/sla";
import {
  getLocalIssue,
  hydrateIssuesFromServer,
  listLocalIssues,
  pullDelta,
  reorderIssueLocal,
  subscribeIssues,
  upsertTeam,
  type ServerIssue,
} from "@/lib/offline/issue-repository";
import { isOfflineEnabled } from "@/lib/offline/feature";
import { issueKey } from "@/lib/utils";

type BoardIssue = {
  id: string;
  number: number | null;
  title: string;
  status: IssueStatus;
  columnKey?: string;
  priority: Priority;
  order: number;
  revision?: number;
  syncStatus?: string;
  createdAt?: string | Date;
  assignee: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
};

function uniqueBoardIssues(rows: BoardIssue[]) {
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

function SortableCard({
  issue,
  teamSlug,
  onConflict,
  slaHours,
  slaWindow,
}: {
  issue: BoardIssue;
  teamSlug: string;
  onConflict: (id: string) => void;
  slaHours?: unknown;
  slaWindow?: SlaWindow;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, data: { status: issue.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const href =
    issue.number != null
      ? `/t/${teamSlug}/issues/${issue.number}`
      : `/t/${teamSlug}/issues/tmp/${issue.id}`;

  return (
    <div
      ref={setNodeRef}
      className="rounded-md border border-separator/80 bg-background px-2.5 py-2 data-[draggable=true]:cursor-grab data-[draggable=true]:active:cursor-grabbing"
      data-draggable={listeners ? "true" : "false"}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between gap-2">
        <NextLink
          className="font-mono text-[11px] text-muted hover:text-accent"
          href={href}
          onClick={(e) => e.stopPropagation()}
        >
          {issueKey(teamSlug, issue.number)}
        </NextLink>
        <div className="flex items-center gap-1">
          {issue.syncStatus === "pending" ? (
            <ArrowPathIcon className="size-3 text-muted" title="Syncing" />
          ) : null}
          {issue.syncStatus === "conflict" ? (
            <button
              className="text-amber-600"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConflict(issue.id);
              }}
            >
              <ExclamationTriangleIcon className="size-3" />
            </button>
          ) : null}
          <PriorityChip quiet priority={issue.priority} />
        </div>
      </div>
      <p className="mt-1 text-[13px] font-medium leading-snug">
        {issue.title}
        {issue.createdAt &&
        slaBreached(
          issue.priority,
          issue.status,
          new Date(issue.createdAt),
          slaHours,
          new Date(),
          slaWindow,
        ) ? (
          <span className="ml-1.5 text-[10px] text-danger">SLA</span>
        ) : null}
      </p>
      {issue.assignee ? (
        <p className="mt-1.5 truncate text-[11px] text-muted">
          {issue.assignee.name ?? issue.assignee.email}
        </p>
      ) : null}
    </div>
  );
}

function Column({
  status,
  label,
  issues,
  teamSlug,
  onConflict,
  slaHours,
  slaWindow,
}: {
  status: string;
  label: string;
  issues: BoardIssue[];
  teamSlug: string;
  onConflict: (id: string) => void;
  slaHours?: unknown;
  slaWindow?: SlaWindow;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[calc(100vh-8rem)] w-64 shrink-0 flex-col border-r border-separator bg-surface/40 ${
        isOver ? "bg-accent/5" : ""
      }`}
    >
      <div className="sticky top-[var(--view-chrome-h)] z-10 flex h-9 items-center justify-between border-b border-separator bg-surface/80 px-3 backdrop-blur-sm">
        <h3 className="text-[13px] font-semibold">{label}</h3>
        <span className="text-[11px] text-muted">{issues.length}</span>
      </div>
      <SortableContext
        items={issues.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-1.5 p-1.5">
          {issues.map((issue) => (
            <SortableCard
              key={issue.id}
              issue={issue}
              slaHours={slaHours}
              slaWindow={slaWindow}
              teamSlug={teamSlug}
              onConflict={onConflict}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function BoardView({
  teamId,
  teamSlug,
  teamName,
  initialIssues,
  columns = BOARD_COLUMNS,
  columnLabels,
  columnStatus,
  columnWorkflowIds,
  groupBy = "status",
  workflows = [],
  filters,
  slaHours,
  slaWindow,
  readOnly = false,
}: {
  teamId: string;
  teamSlug: string;
  teamName: string;
  initialIssues: BoardIssue[];
  columns?: string[];
  columnLabels?: Record<string, string>;
  columnStatus?: Record<string, IssueStatus>;
  columnWorkflowIds?: Record<string, string>;
  groupBy?: "status" | "priority" | "assignee" | "project";
  workflows?: { id: string; name: string; key?: string }[];
  filters?: {
    cycleId?: string;
    priority?: string;
    search?: string;
    labelIds?: string[];
  };
  slaHours?: unknown;
  slaWindow?: SlaWindow;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [issues, setIssues] = useState(() => uniqueBoardIssues(initialIssues));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conflictIssue, setConflictIssue] = useState<LocalIssue | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [peekOpen, setPeekOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: readOnly ? Number.POSITIVE_INFINITY : 6,
      },
    }),
  );
  const columnIds = columns.length ? columns : BOARD_COLUMNS;

  useEffect(() => {
    if (!isOfflineEnabled()) return;

    void upsertTeam({ id: teamId, slug: teamSlug, name: teamName });
    let ready = false;
    const refresh = () => {
      if (!ready) return;
      void listLocalIssues(teamId, filters).then((rows) => {
        const columnsById = new Map(
          initialIssues.map((issue) => [issue.id, issue.columnKey]),
        );

        setIssues(
          uniqueBoardIssues(
            rows.map((row) => ({
              id: row.id,
              number: row.number,
              title: row.title,
              status: row.status as IssueStatus,
              columnKey:
                columnsById.get(row.id) ??
                statusToWorkflowKey(row.status as IssueStatus),
              priority: row.priority as Priority,
              order: row.order,
              revision: row.revision,
              syncStatus: row.syncStatus,
              assignee: row.assignee ?? null,
            })),
          ),
        );
      });
    };

    const unsub = subscribeIssues(refresh);

    void hydrateIssuesFromServer(
      teamId,
      initialIssues.map(
        (issue) =>
          ({
            ...issue,
            number: issue.number ?? 0,
            teamId,
          }) as ServerIssue,
      ),
    ).then(() => {
      ready = true;
      refresh();
      void pullDelta(teamId);
    });

    const onFocus = () => {
      if (ready) void pullDelta(teamId);
    };

    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void pullDelta(teamId);
    }, 60_000);

    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [teamId, teamSlug, teamName, initialIssues, filters]);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      columnIds.map((s) => [s, [] as BoardIssue[]]),
    ) as Record<string, BoardIssue[]>;

    for (const issue of issues) {
      const key = issue.columnKey ?? issue.status;

      if (map[key]) map[key].push(issue);
    }
    for (const status of columnIds) {
      map[status].sort((a, b) => a.order - b.order);
    }

    return map;
  }, [issues, columnIds]);

  const flatIssues = useMemo(
    () => columnIds.flatMap((s) => byStatus[s] ?? []),
    [columnIds, byStatus],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!flatIssues.length) return;
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(flatIssues.length - 1, i + 1));
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(0, i - 1));
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setPeekOpen((o) => !o);
      } else if (e.key === "Escape") {
        setPeekOpen(false);
      } else if (e.key === "Enter" && flatIssues[focusIndex]?.number != null) {
        e.preventDefault();
        router.push(`/t/${teamSlug}/issues/${flatIssues[focusIndex]!.number}`);
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [flatIssues, focusIndex, router, teamSlug]);

  const activeIssue = issues.find((i) => i.id === activeId) ?? null;
  const peekIssue = flatIssues[Math.min(focusIndex, flatIssues.length - 1)];

  async function openConflict(id: string) {
    const local = await getLocalIssue(teamId, id);

    if (local?.syncStatus === "conflict") setConflictIssue(local);
  }

  function onDragStart(event: DragStartEvent) {
    if (readOnly) return;
    setActiveId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (readOnly) return;
    const { active, over } = event;

    if (!over) return;

    const issueId = String(active.id);
    const issue = issues.find((i) => i.id === issueId);

    if (!issue) return;

    if (groupBy !== "status") {
      const overId = String(over.id);
      const nextKey = columnIds.includes(overId)
        ? overId
        : (issues.find((item) => item.id === overId)?.columnKey ??
          issue.columnKey);
      const field =
        groupBy === "assignee"
          ? "assigneeId"
          : groupBy === "project"
            ? "projectId"
            : "priority";
      const value = nextKey === "none" ? null : nextKey;

      setIssues((curr) =>
        curr.map((item) =>
          item.id === issueId
            ? { ...item, columnKey: nextKey ?? item.columnKey }
            : item,
        ),
      );
      await fetch(`/api/teams/${teamId}/issues/${issueId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      return;
    }

    let nextKey = issue.columnKey ?? issue.status;
    const overId = String(over.id);

    if (columnIds.includes(overId)) {
      nextKey = overId;
    } else {
      const overIssue = issues.find((i) => i.id === overId);

      if (overIssue) nextKey = overIssue.columnKey ?? overIssue.status;
    }

    const nextStatus = columnStatus?.[nextKey] ?? (nextKey as IssueStatus);
    const columnIssues = issues
      .filter((i) => (i.columnKey ?? i.status) === nextKey && i.id !== issueId)
      .sort((a, b) => a.order - b.order);

    let insertAt = columnIssues.length;

    if (!columnIds.includes(overId)) {
      const idx = columnIssues.findIndex((i) => i.id === overId);

      if (idx >= 0) insertAt = idx;
    }

    const before = columnIssues[insertAt - 1];
    const after = columnIssues[insertAt];
    let order: number;

    if (!before && !after) order = 1;
    else if (!before && after) order = after.order - 1;
    else if (before && !after) order = before.order + 1;
    else order = ((before?.order ?? 0) + (after?.order ?? 0)) / 2;

    setIssues((curr) =>
      curr.map((i) =>
        i.id === issueId
          ? {
              ...i,
              status: nextStatus,
              columnKey: nextKey,
              order,
              syncStatus: "pending",
            }
          : i,
      ),
    );

    if (isOfflineEnabled()) {
      await reorderIssueLocal(teamId, issueId, nextStatus, order);
    } else {
      const { reorderIssueAction } = await import("@/lib/actions/issues");
      const result = await reorderIssueAction(
        teamSlug,
        issueId,
        nextStatus,
        order,
        columnWorkflowIds?.[nextKey],
      );

      if (result?.error) {
        setIssues(initialIssues);
      }
    }
  }

  return (
    <>
      <DndContext
        collisionDetection={closestCorners}
        sensors={sensors}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
      >
        <div className="flex overflow-x-auto">
          {columnIds.map((status) => (
            <Column
              key={status}
              issues={byStatus[status] ?? []}
              label={
                columnLabels?.[status] ??
                STATUS_LABELS[status as IssueStatus] ??
                status
              }
              slaHours={slaHours}
              slaWindow={slaWindow}
              status={status}
              teamSlug={teamSlug}
              onConflict={(id) => void openConflict(id)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeIssue ? (
            <div className="w-72 rounded-lg border border-accent bg-background p-3 shadow-lg">
              <p className="text-sm font-medium">{activeIssue.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {peekOpen && peekIssue ? (
        <IssuePeek
          issue={peekIssue}
          teamId={teamId}
          teamSlug={teamSlug}
          workflows={workflows}
          onClose={() => setPeekOpen(false)}
        />
      ) : null}
      {conflictIssue ? (
        <ConflictModal
          issue={conflictIssue}
          teamId={teamId}
          onClose={() => setConflictIssue(null)}
        />
      ) : null}
    </>
  );
}
