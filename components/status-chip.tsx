"use client";

import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import { Chip } from "@heroui/react";
import clsx from "clsx";

import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";

const statusColor: Record<
  IssueStatus,
  "default" | "accent" | "success" | "warning" | "danger"
> = {
  BACKLOG: "default",
  TODO: "accent",
  IN_PROGRESS: "warning",
  DONE: "success",
  CANCELLED: "danger",
};

const statusDot: Record<IssueStatus, string> = {
  BACKLOG: "bg-muted/50",
  TODO: "bg-accent",
  IN_PROGRESS: "bg-warning",
  DONE: "bg-success",
  CANCELLED: "bg-danger",
};

const priorityTone: Record<Priority, string> = {
  URGENT: "text-danger",
  HIGH: "text-danger/80",
  MEDIUM: "text-warning",
  LOW: "text-muted",
  NONE: "text-muted",
};

export function StatusChip({
  status,
  quiet = false,
}: {
  status: IssueStatus;
  quiet?: boolean;
}) {
  if (quiet) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
        <span
          aria-hidden
          className={clsx("size-1.5 shrink-0 rounded-full", statusDot[status])}
        />
        <span className="truncate">{STATUS_LABELS[status]}</span>
      </span>
    );
  }

  return (
    <Chip color={statusColor[status]} size="sm" variant="soft">
      {STATUS_LABELS[status]}
    </Chip>
  );
}

export function PriorityChip({
  priority,
  quiet = false,
}: {
  priority: Priority;
  quiet?: boolean;
}) {
  if (priority === "NONE") {
    return <span className="text-[12px] text-muted">—</span>;
  }

  if (quiet) {
    return (
      <span
        className={clsx(
          "w-14 shrink-0 truncate text-[12px] font-medium",
          priorityTone[priority],
        )}
      >
        {PRIORITY_LABELS[priority]}
      </span>
    );
  }

  const color =
    priority === "URGENT" || priority === "HIGH"
      ? "danger"
      : priority === "MEDIUM"
        ? "warning"
        : "default";

  return (
    <Chip color={color} size="sm" variant="soft">
      {PRIORITY_LABELS[priority]}
    </Chip>
  );
}
