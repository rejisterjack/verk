import type { SelectOption } from "@/components/ui/select-field";

import { ESTIMATE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";

export const INITIATIVE_HEALTH_OPTIONS: SelectOption[] = [
  { id: "ON_TRACK", label: "On track" },
  { id: "AT_RISK", label: "At risk" },
  { id: "OFF_TRACK", label: "Off track" },
];

export const PROJECT_STATUS_OPTIONS: SelectOption[] = [
  { id: "BACKLOG", label: "Backlog" },
  { id: "PLANNED", label: "Planned" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];

export const WORKFLOW_STATUS_TYPE_OPTIONS: SelectOption[] = [
  { id: "backlog", label: "backlog" },
  { id: "unstarted", label: "unstarted" },
  { id: "started", label: "started" },
  { id: "completed", label: "completed" },
  { id: "canceled", label: "canceled" },
];

export const VIEW_LAYOUT_OPTIONS: SelectOption[] = [
  { id: "LIST", label: "List" },
  { id: "BOARD", label: "Board" },
];

export const VIEW_STATUS_OPTIONS: SelectOption[] = [
  { id: "", label: "Any status" },
  ...Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label })),
];

export const VIEW_PRIORITY_OPTIONS: SelectOption[] = [
  { id: "", label: "Any priority" },
  { id: "URGENT", label: "Urgent" },
  { id: "HIGH", label: "High" },
  { id: "MEDIUM", label: "Medium" },
  { id: "LOW", label: "Low" },
];

export const ISSUE_FILTER_PRIORITY_OPTIONS: SelectOption[] = [
  { id: "", label: "All priorities" },
  ...Object.entries(PRIORITY_LABELS)
    .filter(([id]) => id !== "NONE")
    .map(([id, label]) => ({ id, label })),
  { id: "NONE", label: "No priority" },
];

export const TEMPLATE_PRIORITY_OPTIONS: SelectOption[] = Object.entries(
  PRIORITY_LABELS,
).map(([id, label]) => ({ id, label }));

export const TEMPLATE_ESTIMATE_OPTIONS: SelectOption[] = Object.entries(
  ESTIMATE_LABELS,
).map(([id, label]) => ({ id, label }));

export function isoDateOnly(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;

  return d.toISOString().slice(0, 10);
}
