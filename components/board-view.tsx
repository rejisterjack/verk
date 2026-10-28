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
import { useEffect, useMemo, useState } from "react";

import { IssuePeek } from "@/components/app/issue-peek";
import { ConflictModal } from "@/components/pwa/conflict-modal";
import { PriorityChip } from "@/components/status-chip";
import { BOARD_COLUMNS, STATUS_LABELS } from "@/lib/labels";
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
  priority: Priority;
  order: number;
  revision?: number;
  syncStatus?: string;
  assignee: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
};

function SortableCard({
  issue,
  teamSlug,
  onConflict,
}: {
  issue: BoardIssue;
  teamSlug: string;
  onConflict: (id: string) => void;
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
      className="rounded-lg border border-separator bg-background p-3 shadow-sm cursor-grab active:cursor-grabbing"
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <NextLink
          className="text-xs text-muted hover:text-accent"
          href={href}
          onClick={(e) => e.stopPropagation()}
        >
          {issueKey(teamSlug, issue.number)}
        </NextLink>
        <div className="flex items-center gap-1">
          {issue.syncStatus === "pending" ? (
            <ArrowPathIcon className="size-3.5 text-muted" title="Syncing" />
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
              <ExclamationTriangleIcon className="size-3.5" />
            </button>
          ) : null}
          <PriorityChip priority={issue.priority} />
        </div>
      </div>
      <p className="mt-1 text-sm font-medium leading-snug">{issue.title}</p>
      {issue.assignee ? (
        <p className="mt-2 text-xs text-muted">
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
}: {
  status: IssueStatus;
  label: string;
  issues: BoardIssue[];
  teamSlug: string;
  onConflict: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[420px] w-72 shrink-0 flex-col rounded-xl border border-separator bg-surface/60 ${
        isOver ? "ring-2 ring-accent/40" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-separator px-3 py-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted">{issues.length}</span>
      </div>
      <SortableContext
        items={issues.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 p-2">
          {issues.map((issue) => (
            <SortableCard
              key={issue.id}
              issue={issue}
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
}: {
  teamId: string;
  teamSlug: string;
  teamName: string;
  initialIssues: BoardIssue[];
  columns?: IssueStatus[];
  columnLabels?: Partial<Record<IssueStatus, string>>;
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conflictIssue, setConflictIssue] = useState<LocalIssue | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [peekOpen, setPeekOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const columnIds = columns.length ? columns : BOARD_COLUMNS;

  useEffect(() => {
    if (!isOfflineEnabled()) return;

    void upsertTeam({ id: teamId, slug: teamSlug, name: teamName });
    void hydrateIssuesFromServer(
      teamId,
      initialIssues.map(
        (i) =>
          ({
            ...i,
            number: i.number ?? 0,
            teamId,
          }) as ServerIssue,
      ),
    );

    const refresh = () => {
      void listLocalIssues(teamId).then((rows) => {
        setIssues(
          rows.map((r) => ({
            id: r.id,
            number: r.number,
            title: r.title,
            status: r.status as IssueStatus,
            priority: r.priority as Priority,
            order: r.order,
            revision: r.revision,
            syncStatus: r.syncStatus,
            assignee: r.assignee ?? null,
          })),
        );
      });
    };

    const unsub = subscribeIssues(refresh);

    refresh();
    void pullDelta(teamId);

    const onFocus = () => void pullDelta(teamId);

    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void pullDelta(teamId);
    }, 60_000);

    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [teamId, teamSlug, teamName, initialIssues]);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      columnIds.map((s) => [s, [] as BoardIssue[]]),
    ) as Record<IssueStatus, BoardIssue[]>;

    for (const issue of issues) {
      if (map[issue.status]) map[issue.status].push(issue);
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
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [flatIssues]);

  const activeIssue = issues.find((i) => i.id === activeId) ?? null;
  const peekIssue = flatIssues[Math.min(focusIndex, flatIssues.length - 1)];

  async function openConflict(id: string) {
    const local = await getLocalIssue(teamId, id);

    if (local?.syncStatus === "conflict") setConflictIssue(local);
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const issueId = String(active.id);
    const issue = issues.find((i) => i.id === issueId);

    if (!issue) return;

    let nextStatus = issue.status;
    const overId = String(over.id);

    if (columnIds.includes(overId as IssueStatus)) {
      nextStatus = overId as IssueStatus;
    } else {
      const overIssue = issues.find((i) => i.id === overId);

      if (overIssue) nextStatus = overIssue.status;
    }

    const columnIssues = issues
      .filter((i) => i.status === nextStatus && i.id !== issueId)
      .sort((a, b) => a.order - b.order);

    let insertAt = columnIssues.length;

    if (!columnIds.includes(overId as IssueStatus)) {
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
          ? { ...i, status: nextStatus, order, syncStatus: "pending" }
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
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columnIds.map((status) => (
            <Column
              key={status}
              issues={byStatus[status] ?? []}
              label={columnLabels?.[status] ?? STATUS_LABELS[status]}
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
          teamSlug={teamSlug}
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
