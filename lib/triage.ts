export function nextTriageAt(
  existing: {
    status: string;
    assigneeId: string | null;
    triageAt?: Date | null;
  },
  patch: { status?: string; assigneeId?: string | null },
): Date | null | undefined {
  const status = patch.status ?? existing.status;
  const assignee =
    patch.assigneeId === undefined ? existing.assigneeId : patch.assigneeId;

  if (status !== "BACKLOG" || assignee) return null;

  const leftTriage = existing.status !== "BACKLOG" || Boolean(existing.assigneeId);

  if (leftTriage) return new Date();

  return undefined;
}
