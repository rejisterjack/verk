import type { Prisma } from "@/lib/generated/prisma/client";
import type { Role } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { assertRole } from "@/lib/roles";
import { type AuditEvent, recordAudit } from "@/lib/audit";

/**
 * A guest limited to some projects sees only issues in those projects. This returns the extra
 * `where` that enforces it, or `null` when the caller is not a limited guest (members, admins and
 * unlimited guests see the whole team).
 *
 * Every read path that returns issues must AND this in, because the scope is enforced here in
 * the service layer, not only in the screens.
 */
export async function guestIssueScope(
  teamId: string,
  userId: string | null | undefined,
): Promise<Prisma.IssueWhereInput | null> {
  if (!userId) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true, guestProjectIds: true },
  });

  if (membership?.role !== "GUEST" || !membership.guestProjectIds.length) {
    return null;
  }

  return { projectId: { in: membership.guestProjectIds } };
}

/** Whether this user may see a given issue (used for single-issue reads). */
export async function canSeeIssue(
  teamId: string,
  userId: string | null | undefined,
  issue: {
    id?: string;
    projectId: string | null;
    visibility?: "TEAM" | "RESTRICTED";
    creatorId?: string;
    assigneeId?: string | null;
  },
): Promise<boolean> {
  const scope = await guestIssueScope(teamId, userId);

  if (scope) {
    const allowed = (scope.projectId as { in: string[] }).in;

    if (issue.projectId === null || !allowed.includes(issue.projectId)) {
      return false;
    }
  }
  if (issue.visibility !== "RESTRICTED") return true;
  if (!userId) return false;
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true },
  });

  if (membership?.role === "ADMIN" || membership?.role === "OWNER") return true;
  if (issue.creatorId === userId || issue.assigneeId === userId) return true;
  if (!issue.id) return false;
  const reader = await prisma.issueReader.findUnique({
    where: { issueId_userId: { issueId: issue.id, userId } },
  });

  return Boolean(reader);
}

/**
 * Extra `where` for every issue list: guest project scope, plus restricted-issue visibility.
 * Admins and owners see restricted issues. An empty result means no extra constraint.
 */
export async function readableIssueScope(
  teamId: string,
  userId: string | null | undefined,
): Promise<Prisma.IssueWhereInput | null> {
  const parts: Prisma.IssueWhereInput[] = [];
  const guest = await guestIssueScope(teamId, userId);

  if (guest) parts.push(guest);
  if (userId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId, teamId } },
      select: { role: true },
    });

    if (membership && membership.role !== "ADMIN" && membership.role !== "OWNER") {
      parts.push({
        OR: [
          { visibility: "TEAM" },
          { visibility: "RESTRICTED", creatorId: userId },
          { visibility: "RESTRICTED", assigneeId: userId },
          { visibility: "RESTRICTED", readers: { some: { userId } } },
        ],
      });
    }
  }
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];

  return { AND: parts };
}

/**
 * Limit a guest to specific projects (pass an empty list to give back the whole team).
 * Admins only; the target must be a guest of this team and every project must belong to it.
 */
export async function setGuestProjects(
  teamId: string,
  membershipId: string,
  projectIds: string[],
  role: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(role, "ADMIN");
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, teamId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!membership) throw new AuthError("Member not found", "NOT_FOUND", 404);
  if (membership.role !== "GUEST") {
    throw new AuthError(
      "Only guests can be limited to projects",
      "BAD_REQUEST",
      400,
    );
  }
  const ids = [...new Set(projectIds)];
  const found = ids.length
    ? await prisma.project.count({ where: { teamId, id: { in: ids } } })
    : 0;

  if (found !== ids.length) {
    throw new AuthError("Unknown project", "BAD_REQUEST", 400);
  }
  await prisma.membership.update({
    where: { id: membershipId },
    data: { guestProjectIds: ids },
  });
  await recordAudit({
    teamId,
    actor,
    action: "member.role_changed",
    targetType: "user",
    targetId: membership.userId,
    summary: ids.length
      ? `Limited guest ${membership.user.name ?? membership.user.email} to ${ids.length} project(s)`
      : `Gave guest ${membership.user.name ?? membership.user.email} access to the whole team`,
    metadata: { projects: ids.length },
  });
}
