"use client";

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

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
import NextLink from "next/link";
import { useMemo, useState, useTransition } from "react";

import { PriorityChip } from "@/components/status-chip";
import { reorderIssueAction } from "@/lib/actions/issues";
import { BOARD_COLUMNS, STATUS_LABELS } from "@/lib/labels";
import { issueKey } from "@/lib/utils";

type BoardIssue = {
  id: string;
  number: number;
  title: string;
  status: IssueStatus;
  priority: Priority;
  order: number;
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
}: {
  issue: BoardIssue;
  teamSlug: string;
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
          href={`/t/${teamSlug}/issues/${issue.number}`}
          onClick={(e) => e.stopPropagation()}
        >
          {issueKey(teamSlug, issue.number)}
        </NextLink>
        <PriorityChip priority={issue.priority} />
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
  issues,
  teamSlug,
}: {
  status: IssueStatus;
  issues: BoardIssue[];
  teamSlug: string;
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
        <h3 className="text-sm font-semibold">{STATUS_LABELS[status]}</h3>
        <span className="text-xs text-muted">{issues.length}</span>
      </div>
      <SortableContext
        items={issues.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 p-2">
          {issues.map((issue) => (
            <SortableCard key={issue.id} issue={issue} teamSlug={teamSlug} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function BoardView({
  teamSlug,
  initialIssues,
}: {
  teamSlug: string;
  initialIssues: BoardIssue[];
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      BOARD_COLUMNS.map((s) => [s, [] as BoardIssue[]]),
    ) as Record<IssueStatus, BoardIssue[]>;

    for (const issue of issues) {
      if (map[issue.status]) map[issue.status].push(issue);
    }
    for (const status of BOARD_COLUMNS) {
      map[status].sort((a, b) => a.order - b.order);
    }

    return map;
  }, [issues]);

  const activeIssue = issues.find((i) => i.id === activeId) ?? null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const issueId = String(active.id);
    const issue = issues.find((i) => i.id === issueId);

    if (!issue) return;

    let nextStatus = issue.status;
    const overId = String(over.id);

    if (BOARD_COLUMNS.includes(overId as IssueStatus)) {
      nextStatus = overId as IssueStatus;
    } else {
      const overIssue = issues.find((i) => i.id === overId);

      if (overIssue) nextStatus = overIssue.status;
    }

    const columnIssues = issues
      .filter((i) => i.status === nextStatus && i.id !== issueId)
      .sort((a, b) => a.order - b.order);

    let insertAt = columnIssues.length;

    if (!BOARD_COLUMNS.includes(overId as IssueStatus)) {
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

    const prev = issues;

    setIssues((curr) =>
      curr.map((i) =>
        i.id === issueId ? { ...i, status: nextStatus, order } : i,
      ),
    );

    startTransition(async () => {
      const result = await reorderIssueAction(
        teamSlug,
        issueId,
        nextStatus,
        order,
      );

      if (result?.error) setIssues(prev);
    });
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      sensors={sensors}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((status) => (
          <Column
            key={status}
            issues={byStatus[status]}
            status={status}
            teamSlug={teamSlug}
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
  );
}
