import type {
  IssueStatus,
  Priority,
  Role,
} from "@/lib/generated/prisma/client";

export const STATUS_LABELS: Record<IssueStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  NONE: "No priority",
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export const BOARD_COLUMNS: IssueStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
];
