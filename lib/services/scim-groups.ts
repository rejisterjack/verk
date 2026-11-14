import { prisma } from "@/lib/db";
import {
  applyGroupOperations,
  type GroupMember,
  type GroupOperation,
  type MemberRef,
} from "@/lib/scim";

export async function findGroup(id: string) {
  return prisma.team.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });
}

export async function listGroupMembers(teamId: string): Promise<GroupMember[]> {
  const rows = await prisma.membership.findMany({
    where: { teamId },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({ id: row.user.id, email: row.user.email }));
}

/**
 * Resolve SCIM member references (user id, or email for older clients) to Verk user ids.
 * Unknown users are dropped: SCIM Groups links existing users, it never invents accounts.
 */
export async function resolveMemberIds(refs: MemberRef[]) {
  const ids = refs
    .map((ref) => ref.id)
    .filter((id): id is string => Boolean(id));
  const emails = refs
    .map((ref) => ref.email)
    .filter((email): email is string => Boolean(email));

  if (!ids.length && !emails.length) return new Map<string, string>();
  const users = await prisma.user.findMany({
    where: { OR: [{ id: { in: ids } }, { email: { in: emails } }] },
    select: { id: true, email: true },
  });
  const byKey = new Map<string, string>();

  for (const user of users) {
    byKey.set(user.id, user.id);
    byKey.set(user.email.toLowerCase(), user.id);
  }

  return byKey;
}

/**
 * Apply SCIM operations to a team's membership.
 *   - new members get MEMBER; existing members keep their role
 *   - OWNER memberships are never removed or demoted, whatever the IdP says
 *   - users that don't exist in Verk are skipped
 */
export async function applyGroupMembership(
  teamId: string,
  ops: GroupOperation[],
) {
  const current = await prisma.membership.findMany({
    where: { teamId },
    select: { userId: true, role: true },
  });
  const owners = new Set(
    current.filter((row) => row.role === "OWNER").map((row) => row.userId),
  );
  const refs = ops.flatMap((op) => op.members);
  const lookup = await resolveMemberIds(refs);
  const resolve = (ref: MemberRef) =>
    (ref.id && lookup.get(ref.id)) ||
    (ref.email && lookup.get(ref.email.toLowerCase())) ||
    null;
  const before = new Set(current.map((row) => row.userId));
  const after = applyGroupOperations(before, ops, resolve);

  for (const ownerId of owners) after.add(ownerId);

  const toAdd = [...after].filter((id) => !before.has(id));
  const toRemove = [...before].filter((id) => !after.has(id));

  if (toRemove.length) {
    await prisma.membership.deleteMany({
      where: { teamId, userId: { in: toRemove }, role: { not: "OWNER" } },
    });
  }
  if (toAdd.length) {
    await prisma.membership.createMany({
      data: toAdd.map((userId) => ({
        teamId,
        userId,
        role: "MEMBER" as const,
      })),
      skipDuplicates: true,
    });
  }

  return { added: toAdd.length, removed: toRemove.length };
}

/** Deleting a group removes everyone except OWNERs. The team itself is never deleted. */
export async function clearGroupMembers(teamId: string) {
  const { count } = await prisma.membership.deleteMany({
    where: { teamId, role: { not: "OWNER" } },
  });

  return count;
}

/** Find the team a SCIM client means by name or slug, for linking (never creating) a group. */
export async function findTeamByGroupName(input: {
  displayName?: string;
  externalId?: string;
}) {
  const or = [
    ...(input.externalId ? [{ slug: input.externalId.toLowerCase() }] : []),
    ...(input.displayName
      ? [
          { name: { equals: input.displayName, mode: "insensitive" as const } },
          { slug: input.displayName.toLowerCase() },
        ]
      : []),
  ];

  if (!or.length) return null;

  return prisma.team.findFirst({
    where: { OR: or },
    select: { id: true, name: true, slug: true },
  });
}
