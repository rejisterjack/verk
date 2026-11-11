import { z } from "zod";

import { Role } from "@/lib/generated/prisma/client";
import { sendInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { assertRole } from "@/lib/rbac";
import { randomToken, sha256, slugify } from "@/lib/utils";
import { inviteSchema, updateMemberRoleSchema } from "@/lib/validators";

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

export async function createTeamInWorkspace(workspaceId: string, name: string) {
  const { createTeam } = await import("@/lib/services/teams");
  const team = await createTeam({ name });

  await prisma.team.update({
    where: { id: team.id },
    data: { workspaceId },
  });

  return team;
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

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  membershipId: string,
  input: unknown,
  actorRole: Role,
) {
  assertRole(actorRole, "ADMIN");
  const data = updateMemberRoleSchema.parse(input);
  const membership = await prisma.workspaceMember.findFirst({
    where: { id: membershipId, workspaceId },
  });

  if (!membership) {
    throw new AuthError("Member not found", "NOT_FOUND", 404);
  }
  if (membership.role === "OWNER" || data.role === "OWNER") {
    assertRole(actorRole, "OWNER");
  }
  if (membership.role === "OWNER" && data.role !== "OWNER") {
    const owners = await prisma.workspaceMember.count({
      where: { workspaceId, role: "OWNER" },
    });

    if (owners <= 1) {
      throw new AuthError("Cannot demote the last owner", "LAST_OWNER", 400);
    }
  }

  return prisma.workspaceMember.update({
    where: { id: membershipId },
    data: { role: data.role },
  });
}

export async function removeWorkspaceMember(
  workspaceId: string,
  membershipId: string,
  actorRole: Role,
) {
  assertRole(actorRole, "ADMIN");
  const membership = await prisma.workspaceMember.findFirst({
    where: { id: membershipId, workspaceId },
  });

  if (!membership) {
    throw new AuthError("Member not found", "NOT_FOUND", 404);
  }
  if (membership.role === "OWNER") {
    assertRole(actorRole, "OWNER");
    const owners = await prisma.workspaceMember.count({
      where: { workspaceId, role: "OWNER" },
    });

    if (owners <= 1) {
      throw new AuthError("Cannot remove the last owner", "LAST_OWNER", 400);
    }
  }
  await prisma.workspaceMember.delete({ where: { id: membershipId } });
}

export async function listWorkspaceInvites(workspaceId: string) {
  return prisma.workspaceInvite.findMany({
    where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createWorkspaceInvite(
  workspaceId: string,
  invitedById: string,
  input: unknown,
  actorRole: Role,
  origin: string,
) {
  assertRole(actorRole, "ADMIN");
  const data = inviteSchema.parse(input);
  const email = data.email.toLowerCase();
  const existingMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId, user: { email } },
  });

  if (existingMember) {
    throw new AuthError("User is already a member", "ALREADY_MEMBER", 409);
  }

  const token = randomToken(24);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
  });
  const inviter = await prisma.user.findUnique({ where: { id: invitedById } });
  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email,
      role: data.role,
      tokenHash,
      expiresAt,
      invitedById,
    },
  });
  const inviteUrl = `${origin}/invite/workspace/${token}`;
  const emailResult = await sendInviteEmail({
    to: email,
    teamName: workspace.name,
    inviteUrl,
    inviterName: inviter?.name,
  });

  return {
    invite,
    inviteUrl,
    emailSent: emailResult.sent,
    emailError: emailResult.error,
  };
}

export async function revokeWorkspaceInvite(
  workspaceId: string,
  inviteId: string,
  actorRole: Role,
) {
  assertRole(actorRole, "ADMIN");
  const invite = await prisma.workspaceInvite.findFirst({
    where: { id: inviteId, workspaceId },
  });

  if (!invite) {
    throw new AuthError("Invite not found", "NOT_FOUND", 404);
  }
  await prisma.workspaceInvite.delete({ where: { id: inviteId } });
}

export async function acceptWorkspaceInvite(
  token: string,
  userId: string,
  userEmail: string,
) {
  const tokenHash = await sha256(token);
  const invite = await prisma.workspaceInvite.findUnique({
    where: { tokenHash },
    include: { workspace: true },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new AuthError("Invite is invalid or expired", "INVALID_INVITE", 400);
  }
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new AuthError(
      "This invite was sent to a different email address",
      "EMAIL_MISMATCH",
      403,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: invite.workspaceId, userId },
      },
      create: {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
      },
      update: {},
    });
    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  return invite.workspace;
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

export async function createWorkflowStatus(teamId: string, input: unknown) {
  const data = z
    .object({
      name: z.string().min(1).max(40),
      key: z
        .string()
        .min(1)
        .max(40)
        .regex(/^[a-z0-9_]+$/),
      type: z.enum([
        "backlog",
        "unstarted",
        "started",
        "completed",
        "canceled",
      ]),
    })
    .parse(input);
  const max = await prisma.workflowStatus.aggregate({
    where: { teamId },
    _max: { position: true },
  });

  return prisma.workflowStatus.create({
    data: {
      teamId,
      name: data.name,
      key: data.key,
      type: data.type,
      position: (max._max.position ?? -1) + 1,
    },
  });
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
