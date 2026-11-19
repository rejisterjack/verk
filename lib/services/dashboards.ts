import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { assertRole } from "@/lib/rbac";
import type { Role } from "@/lib/generated/prisma/client";

const KINDS = ["insight", "burndown", "velocity", "markdown"] as const;

export async function listDashboards(
  teamId: string,
  userId: string | null | undefined,
) {
  return prisma.dashboard.findMany({
    where: {
      teamId,
      OR: [{ shared: true }, { ownerId: userId ?? "__none__" }],
    },
    include: { widgets: { orderBy: { position: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createDashboard(
  teamId: string,
  userId: string,
  name: string,
  shared: boolean,
  role: Role,
) {
  assertRole(role, "MEMBER");

  return prisma.dashboard.create({
    data: { teamId, ownerId: userId, name, shared },
  });
}

export async function addWidget(
  teamId: string,
  dashboardId: string,
  input: { kind: string; title: string; body: string },
  role: Role,
) {
  assertRole(role, "MEMBER");
  if (!KINDS.includes(input.kind as (typeof KINDS)[number])) {
    throw new AuthError("Unknown widget", "BAD_REQUEST", 400);
  }
  const dashboard = await prisma.dashboard.findFirst({
    where: { id: dashboardId, teamId },
    select: { id: true },
  });

  if (!dashboard) throw new AuthError("Dashboard not found", "NOT_FOUND", 404);
  const count = await prisma.dashboardWidget.count({ where: { dashboardId } });

  return prisma.dashboardWidget.create({
    data: {
      dashboardId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      position: count,
    },
  });
}
