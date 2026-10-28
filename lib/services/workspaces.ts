import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { slugify } from "@/lib/utils";

const workspaceSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export async function ensureWorkspaceForTeam(
  teamId: string,
  ownerId: string,
  teamName: string,
  teamSlug: string,
) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });

  if (!team) throw new AuthError("Team not found", "NOT_FOUND", 404);
  if (team.workspaceId) {
    return prisma.workspace.findUniqueOrThrow({
      where: { id: team.workspaceId },
    });
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: teamName,
      slug: teamSlug,
      members: {
        create: { userId: ownerId, role: "OWNER" },
      },
    },
  });

  await prisma.team.update({
    where: { id: teamId },
    data: { workspaceId: workspace.id },
  });

  return workspace;
}

export async function createWorkspace(userId: string, input: unknown) {
  const data = workspaceSchema.parse(input);
  const slug = data.slug ?? slugify(data.name);

  return prisma.workspace.create({
    data: {
      name: data.name,
      slug,
      members: { create: { userId, role: "OWNER" } },
    },
  });
}

export async function listUserWorkspaces(userId: string) {
  return prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: { teams: { select: { id: true, name: true, slug: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function seedDefaultWorkflowStatuses(teamId: string) {
  const defaults = [
    { key: "backlog", name: "Backlog", type: "backlog" as const, position: 0 },
    { key: "todo", name: "Todo", type: "unstarted" as const, position: 1 },
    {
      key: "in_progress",
      name: "In Progress",
      type: "started" as const,
      position: 2,
    },
    { key: "done", name: "Done", type: "completed" as const, position: 3 },
    {
      key: "canceled",
      name: "Canceled",
      type: "canceled" as const,
      position: 4,
    },
  ];

  await prisma.workflowStatus.createMany({
    data: defaults.map((d) => ({ ...d, teamId })),
    skipDuplicates: true,
  });
}

export async function listWorkflowStatuses(teamId: string) {
  let statuses = await prisma.workflowStatus.findMany({
    where: { teamId },
    orderBy: { position: "asc" },
  });

  if (!statuses.length) {
    await seedDefaultWorkflowStatuses(teamId);
    statuses = await prisma.workflowStatus.findMany({
      where: { teamId },
      orderBy: { position: "asc" },
    });
  }

  return statuses;
}

export async function renameWorkflowStatus(
  teamId: string,
  statusId: string,
  name: string,
) {
  const existing = await prisma.workflowStatus.findFirst({
    where: { id: statusId, teamId },
  });

  if (!existing) return null;

  return prisma.workflowStatus.update({
    where: { id: statusId },
    data: { name: name.trim().slice(0, 40) },
  });
}

export async function reorderWorkflowStatuses(
  teamId: string,
  orderedIds: string[],
) {
  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.workflowStatus.updateMany({
        where: { id, teamId },
        data: { position },
      }),
    ),
  );
}
