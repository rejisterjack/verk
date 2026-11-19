import { NextRequest } from "next/server";

import { Role } from "@/lib/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http-error";
import { AuthError, assertRole } from "@/lib/rbac";
import { effectiveApiKeyRole } from "@/lib/roles";
import { sha256 } from "@/lib/utils";

export { jsonError };

export async function authenticateRequest(
  request: NextRequest,
  teamId: string,
  minRole: Role = "MEMBER",
) {
  const header = request.headers.get("authorization");

  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();

    if (!token.startsWith("verk_")) {
      throw new AuthError("Invalid API key", "UNAUTHORIZED", 401);
    }
    const prefix = token.slice(0, 12);
    const keyHash = await sha256(token);
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        prefix,
        keyHash,
        teamId,
        revokedAt: null,
      },
      include: { team: true, createdBy: true },
    });

    if (!apiKey || apiKey.createdBy.disabled) {
      throw new AuthError("Invalid API key", "UNAUTHORIZED", 401);
    }
    // The key's role, capped by its creator's CURRENT team role. A creator who
    // was demoted or removed immediately weakens or kills their keys.
    const membership = await prisma.membership.findUnique({
      where: {
        userId_teamId: { userId: apiKey.createdById, teamId: apiKey.teamId },
      },
      select: { role: true },
    });
    const role = effectiveApiKeyRole(apiKey.role, membership?.role);

    if (!role) {
      throw new AuthError("Invalid API key", "UNAUTHORIZED", 401);
    }
    assertRole(role, minRole);
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      type: "apiKey" as const,
      user: apiKey.createdBy,
      team: apiKey.team,
      role,
    };
  }

  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthError("Unauthorized", "UNAUTHORIZED", 401);
  }
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
    include: { team: true },
  });

  if (!membership) {
    throw new AuthError("Not a team member", "FORBIDDEN", 403);
  }
  assertRole(membership.role, minRole);

  return {
    type: "session" as const,
    user: session.user,
    team: membership.team,
    role: membership.role,
  };
}
