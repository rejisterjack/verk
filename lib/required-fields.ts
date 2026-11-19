export const REQUIRED_FIELD_KEYS = [
  "assignee",
  "estimate",
  "dueDate",
  "startDate",
  "project",
  "cycle",
] as const;

export type RequiredFieldKey = (typeof REQUIRED_FIELD_KEYS)[number];

export type RequiredIssue = {
  assigneeId?: string | null;
  estimate?: string | null;
  dueDate?: Date | string | null;
  startDate?: Date | string | null;
  projectId?: string | null;
  cycleId?: string | null;
};

const EMPTY_ESTIMATE = new Set(["", "NONE", null, undefined]);

export function isRequiredField(value: string): value is RequiredFieldKey {
  return (REQUIRED_FIELD_KEYS as readonly string[]).includes(value);
}

/** Names of required fields that are still empty on the issue after the edit. */
export function missingRequiredFields(
  required: readonly string[],
  issue: RequiredIssue,
) {
  const missing: RequiredFieldKey[] = [];

  for (const key of required) {
    if (!isRequiredField(key)) continue;
    const empty =
      key === "assignee"
        ? !issue.assigneeId
        : key === "estimate"
          ? EMPTY_ESTIMATE.has(issue.estimate ?? null)
          : key === "dueDate"
            ? !issue.dueDate
            : key === "startDate"
              ? !issue.startDate
              : key === "project"
                ? !issue.projectId
                : !issue.cycleId;

    if (empty) missing.push(key);
  }

  return missing;
}
