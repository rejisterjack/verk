import type { IssueStatus, Priority } from "@/lib/generated/prisma/client";

import { Chip } from "@heroui/react";

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

export function StatusChip({ status }: { status: IssueStatus }) {
  return (
    <Chip color={statusColor[status]} size="sm" variant="soft">
      {STATUS_LABELS[status]}
    </Chip>
  );
}

export function PriorityChip({ priority }: { priority: Priority }) {
  if (priority === "NONE") {
    return <span className="text-muted text-sm">—</span>;
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
