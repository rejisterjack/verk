import { redirect } from "next/navigation";

import { Role } from "@/lib/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { assertRole as assertRoleBase, roleAtLeast } from "@/lib/roles";

export { roleAtLeast, AuthError };

export function assertRole(role: Role, min: Role): void {
  try {
    assertRoleBase(role, min);
  } catch {
    throw new AuthError("Insufficient permissions", "FORBIDDEN", 403);
  }
}

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthError("Unauthorized", "UNAUTHORIZED", 401);
  }

  return session.user;
}

export async function requireUserOrRedirect(callbackUrl = "/login") {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(callbackUrl);
  }

  return session.user;
}

export async function getMembership(userId: string, teamId: string) {
  return prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    include: { team: true },
  });
}

export async function requireMembership(
  teamId: string,
  minRole: Role = "MEMBER",
) {
  const user = await requireUser();
  const membership = await getMembership(user.id, teamId);

  if (!membership) {
    throw new AuthError("Not a team member", "FORBIDDEN", 403);
  }
  assertRole(membership.role, minRole);

  return { user, membership, team: membership.team };
}

export async function requireTeamBySlug(
  slug: string,
  minRole: Role = "MEMBER",
) {
  const user = await requireUser();
  const team = await prisma.team.findUnique({ where: { slug } });

  if (!team) {
    throw new AuthError("Team not found", "NOT_FOUND", 404);
  }
  const membership = await getMembership(user.id, team.id);

  if (!membership) {
    throw new AuthError("Not a team member", "FORBIDDEN", 403);
  }
  assertRole(membership.role, minRole);

  return { user, membership, team };
}

export async function listUserTeams(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { team: true },
    orderBy: { createdAt: "asc" },
  });
}
