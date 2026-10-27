import { NextRequest } from "next/server";

import { Role } from "@/lib/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuthError, assertRole } from "@/lib/rbac";
import { sha256 } from "@/lib/utils";

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

    if (!apiKey) {
      throw new AuthError("Invalid API key", "UNAUTHORIZED", 401);
    }
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });
    // API keys act with ADMIN privileges for MCP/agent use within the team
    assertRole("ADMIN", minRole);

    return {
      type: "apiKey" as const,
      user: apiKey.createdBy,
      team: apiKey.team,
      role: "ADMIN" as Role,
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

export function jsonError(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console -- useful during local debugging
    console.error(error);
  }

  return Response.json(
    { error: "Internal server error", code: "INTERNAL" },
    { status: 500 },
  );
}
