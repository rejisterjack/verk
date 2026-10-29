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

export async function snoozeTriage(teamId: string, issueId: string, until: Date) {
  const { prisma } = await import("@/lib/db");
  const { AuthError } = await import("@/lib/errors");
  const existing = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!existing) throw new AuthError("Issue not found", "NOT_FOUND", 404);

  await prisma.issue.update({
    where: { id: issueId },
    data: { triageAt: until, revision: { increment: 1 } },
  });
}
