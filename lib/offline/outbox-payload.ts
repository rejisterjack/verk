/** Pure helpers for offline outbox payloads (unit-testable without IndexedDB). */

export type CreateIssueLocalInput = {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  estimate?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
  cycleId?: string | null;
  projectId?: string | null;
  labelIds?: string[];
  creatorId?: string;
};

export type UpdateIssueLocalPatch = {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  estimate?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
  cycleId?: string | null;
  projectId?: string | null;
  order?: number;
};

export function normalizeDueDate(
  raw: string | null | undefined,
): string | null {
  if (raw == null || raw === "") return null;
  const d = new Date(raw);

  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString();
}

export function buildCreateOutboxPayload(
  input: CreateIssueLocalInput,
  clientMutationId: string,
): Record<string, unknown> {
  const dueDate = normalizeDueDate(input.dueDate ?? null);

  return {
    title: input.title,
    description: input.description ?? "",
    status: input.status ?? "BACKLOG",
    priority: input.priority ?? "NONE",
    estimate: input.estimate ?? "NONE",
    dueDate,
    assigneeId: input.assigneeId ?? null,
    cycleId: input.cycleId ?? null,
    projectId: input.projectId ?? null,
    labelIds: input.labelIds ?? [],
    clientMutationId,
  };
}

export function buildUpdateOutboxPayload(
  patch: UpdateIssueLocalPatch,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch };

  if ("dueDate" in patch) {
    out.dueDate = normalizeDueDate(patch.dueDate ?? null);
  }

  return out;
}
