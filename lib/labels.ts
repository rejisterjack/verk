import type {
  Estimate,
  IssueStatus,
  Priority,
  Role,
} from "@/lib/generated/prisma/client";

export const STATUS_LABELS: Record<IssueStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  CANCELLED: "Canceled",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  NONE: "No priority",
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const ESTIMATE_LABELS: Record<Estimate, string> = {
  NONE: "No estimate",
  XS: "XS",
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL",
  ONE: "1",
  TWO: "2",
  THREE: "3",
  FIVE: "5",
  EIGHT: "8",
  THIRTEEN: "13",
};

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  GUEST: "Guest",
};

export const BOARD_COLUMNS: IssueStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
];

/** Map WorkflowStatus.key → IssueStatus enum */
export const WORKFLOW_KEY_TO_STATUS: Record<string, IssueStatus> = {
  backlog: "BACKLOG",
  todo: "TODO",
  in_progress: "IN_PROGRESS",
  done: "DONE",
  canceled: "CANCELLED",
  cancelled: "CANCELLED",
};

export const WORKFLOW_TYPE_TO_STATUS: Record<string, IssueStatus> = {
  backlog: "BACKLOG",
  unstarted: "TODO",
  started: "IN_PROGRESS",
  completed: "DONE",
  canceled: "CANCELLED",
};

export function statusToWorkflowKey(status: IssueStatus): string {
  const map: Record<IssueStatus, string> = {
    BACKLOG: "backlog",
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done",
    CANCELLED: "canceled",
  };

  return map[status];
}
