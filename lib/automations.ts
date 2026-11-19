/**
 * Automation rules: "when <trigger> and the issue matches <conditions>, do <actions>".
 *
 * This file is pure (parsing, validation, descriptions). The database work lives in
 * `lib/services/automations.ts`.
 *
 * Safety rules baked in here and in the service:
 *  - Actions are a closed list; nothing is executed from free text.
 *  - Actions write straight to the issue row and never go through `updateIssue`, so one
 *    automation can never start another (no loops).
 *  - At most `MAX_AUTOMATIONS_PER_TEAM` rules, `MAX_ACTIONS` actions each.
 */

import { z } from "zod";

import { type Filter, isEmptyFilter, parseFilter } from "@/lib/issue-filter";

export const TRIGGERS = [
  { id: "issue.created", label: "An issue is created" },
  { id: "issue.status_changed", label: "An issue's status changes" },
  { id: "issue.assigned", label: "An issue is assigned or reassigned" },
  { id: "issue.priority_changed", label: "An issue's priority changes" },
  { id: "issue.label_added", label: "A label is added to an issue" },
  { id: "issue.comment_created", label: "A comment is added" },
  { id: "issue.due_changed", label: "The due date changes" },
  { id: "issue.cycle_changed", label: "The cycle changes" },
] as const;

export type TriggerId = (typeof TRIGGERS)[number]["id"];

export const MAX_AUTOMATIONS_PER_TEAM = 100;
export const MAX_ACTIONS = 10;
export const MAX_AUTOMATION_DEPTH = 2;

const STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
] as const;
const PRIORITIES = ["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"] as const;
const id = z.string().min(1).max(40);

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("set_status"), status: z.enum(STATUSES) }),
  z.object({ type: z.literal("set_priority"), priority: z.enum(PRIORITIES) }),
  z.object({ type: z.literal("set_assignee"), assigneeId: id.nullable() }),
  z.object({ type: z.literal("add_label"), labelId: id }),
  z.object({ type: z.literal("remove_label"), labelId: id }),
  z.object({ type: z.literal("set_cycle"), cycleId: id.nullable() }),
  z.object({ type: z.literal("set_project"), projectId: id.nullable() }),
  z.object({
    type: z.literal("add_comment"),
    body: z.string().min(1).max(2000),
  }),
  z.object({ type: z.literal("notify"), userId: id }),
]);

export type AutomationAction = z.infer<typeof actionSchema>;

export const automationInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  trigger: z.enum(TRIGGERS.map((t) => t.id) as [TriggerId, ...TriggerId[]]),
  enabled: z.boolean().optional(),
  /** An issue filter tree, or null/omitted to match every issue. */
  conditions: z.unknown().optional(),
  actions: z.array(actionSchema).min(1).max(MAX_ACTIONS),
});

export type AutomationInput = z.infer<typeof automationInputSchema>;

/** Parse the stored filter, treating an empty or missing one as "match everything". */
export function parseConditions(raw: unknown): Filter | null {
  if (raw === null || raw === undefined) return null;
  const filter = parseFilter(raw);

  return isEmptyFilter(filter) ? null : filter;
}

/** Re-validate actions read back from the database; unknown ones are dropped, not run. */
export function parseActions(raw: unknown): AutomationAction[] {
  if (!Array.isArray(raw)) return [];
  const out: AutomationAction[] = [];

  for (const item of raw.slice(0, MAX_ACTIONS)) {
    const parsed = actionSchema.safeParse(item);

    if (parsed.success) out.push(parsed.data);
  }

  return out;
}

/** Whether an action touches the issue's columns (as opposed to adding a comment or notifying). */
export function isFieldAction(action: AutomationAction): boolean {
  return !["add_label", "remove_label", "add_comment", "notify"].includes(
    action.type,
  );
}

/** Collapse field actions into one column patch; later actions win over earlier ones. */
export function fieldPatch(actions: AutomationAction[]): {
  status?: (typeof STATUSES)[number];
  priority?: (typeof PRIORITIES)[number];
  assigneeId?: string | null;
  cycleId?: string | null;
  projectId?: string | null;
} {
  const patch: ReturnType<typeof fieldPatch> = {};

  for (const action of actions) {
    if (action.type === "set_status") patch.status = action.status;
    if (action.type === "set_priority") patch.priority = action.priority;
    if (action.type === "set_assignee") patch.assigneeId = action.assigneeId;
    if (action.type === "set_cycle") patch.cycleId = action.cycleId;
    if (action.type === "set_project") patch.projectId = action.projectId;
  }

  return patch;
}

/** What changed on an issue, so the service can tell which triggers fired. */
export type IssueChange = {
  statusChanged?: boolean;
  priorityChanged?: boolean;
  assigneeChanged?: boolean;
  labelsAdded?: string[];
  commentCreated?: boolean;
  dueChanged?: boolean;
  cycleChanged?: boolean;
  /** Rules that already ran in this chain, so a rule cannot trigger itself. */
  skipRuleIds?: string[];
};

export function triggersFor(change: IssueChange | "created"): TriggerId[] {
  if (change === "created") return ["issue.created"];
  const out: TriggerId[] = [];

  if (change.statusChanged) out.push("issue.status_changed");
  if (change.assigneeChanged) out.push("issue.assigned");
  if (change.priorityChanged) out.push("issue.priority_changed");
  if (change.labelsAdded?.length) out.push("issue.label_added");
  if (change.commentCreated) out.push("issue.comment_created");
  if (change.dueChanged) out.push("issue.due_changed");
  if (change.cycleChanged) out.push("issue.cycle_changed");

  return out;
}

export function describeAction(
  action: AutomationAction,
  names: { users?: Map<string, string>; labels?: Map<string, string> } = {},
): string {
  const user = (userId: string | null) =>
    userId ? (names.users?.get(userId) ?? "a member") : "nobody";
  const label = (labelId: string) => names.labels?.get(labelId) ?? "a label";

  switch (action.type) {
    case "set_status":
      return `set status to ${action.status.replace("_", " ").toLowerCase()}`;
    case "set_priority":
      return `set priority to ${action.priority.toLowerCase()}`;
    case "set_assignee":
      return `assign to ${user(action.assigneeId)}`;
    case "add_label":
      return `add label ${label(action.labelId)}`;
    case "remove_label":
      return `remove label ${label(action.labelId)}`;
    case "set_cycle":
      return action.cycleId ? "move to a cycle" : "remove from its cycle";
    case "set_project":
      return action.projectId ? "move to a project" : "remove from its project";
    case "add_comment":
      return `comment "${action.body.slice(0, 40)}${action.body.length > 40 ? "…" : ""}"`;
    case "notify":
      return `notify ${user(action.userId)}`;
  }
}
