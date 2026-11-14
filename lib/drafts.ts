/**
 * What a draft may hold. A draft is a loose snapshot of the create form, so we keep only known
 * keys, cap every string, and never trust it as a finished issue: publishing runs the normal
 * `createIssue` validation again.
 */

export const DRAFT_FIELDS = [
  "title",
  "description",
  "status",
  "workflowStatusId",
  "priority",
  "estimate",
  "dueDate",
  "assigneeId",
  "cycleId",
  "projectId",
  "milestoneId",
] as const;

export type DraftField = (typeof DRAFT_FIELDS)[number];

export type DraftFields = Partial<Record<DraftField, string>> & {
  labelIds?: string[];
};

export const MAX_DRAFTS_PER_USER = 50;
const MAX_TEXT = 20_000;
const MAX_LABELS = 50;

export function sanitizeDraftFields(input: unknown): DraftFields {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const out: DraftFields = {};

  for (const field of DRAFT_FIELDS) {
    const value = raw[field];

    if (typeof value === "string" && value.length > 0) {
      out[field] = value.slice(0, field === "description" ? MAX_TEXT : 300);
    }
  }
  if (Array.isArray(raw.labelIds)) {
    const ids = raw.labelIds
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .map((id) => id.slice(0, 60));

    if (ids.length) out.labelIds = [...new Set(ids)].slice(0, MAX_LABELS);
  }

  return out;
}

/** A draft is worth saving only if the person typed something. */
export function isBlankDraft(fields: DraftFields): boolean {
  return !fields.title?.trim() && !fields.description?.trim();
}

/** A label for the drafts list: the title, or the first line of the description. */
export function draftTitle(fields: DraftFields): string {
  const title = fields.title?.trim();

  if (title) return title.slice(0, 120);
  const firstLine = fields.description?.trim().split("\n")[0];

  return firstLine ? firstLine.slice(0, 120) : "Untitled draft";
}

/** Draft fields ready for `createIssue`: ids that are empty become null. */
export function draftToIssueInput(fields: DraftFields) {
  return {
    title: fields.title ?? "",
    description: fields.description ?? "",
    ...(fields.workflowStatusId
      ? { workflowStatusId: fields.workflowStatusId }
      : fields.status
        ? { status: fields.status }
        : {}),
    priority: fields.priority ?? "NONE",
    estimate: fields.estimate ?? "NONE",
    dueDate: fields.dueDate ? new Date(fields.dueDate) : null,
    assigneeId: fields.assigneeId ?? null,
    cycleId: fields.cycleId ?? null,
    projectId: fields.projectId ?? null,
    milestoneId: fields.milestoneId ?? null,
    labelIds: fields.labelIds ?? [],
  };
}
