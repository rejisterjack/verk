import { Role } from "@/lib/generated/prisma/client";
import { type AuditEvent, recordAudit } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { AuthError, assertRole } from "@/lib/rbac";
import { randomToken, sha256 } from "@/lib/utils";
import { inviteSchema, updateMemberRoleSchema } from "@/lib/validators";

export async function listMembers(teamId: string) {
  return prisma.membership.findMany({
    where: { teamId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateMemberRole(
  teamId: string,
  membershipId: string,
  input: unknown,
  actorRole: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(actorRole, "ADMIN");
  const data = updateMemberRoleSchema.parse(input);
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, teamId },
  });

  if (!membership) {
    throw new AuthError("Member not found", "NOT_FOUND", 404);
  }
  if (membership.role === "OWNER" || data.role === "OWNER") {
    assertRole(actorRole, "OWNER");
  }
  if (membership.role === "OWNER" && data.role !== "OWNER") {
    const owners = await prisma.membership.count({
      where: { teamId, role: "OWNER" },
    });

    if (owners <= 1) {
      throw new AuthError("Cannot demote the last owner", "LAST_OWNER", 400);
    }
  }

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { role: data.role },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (membership.role !== data.role) {
    await recordAudit({
      teamId,
      actor,
      action: "member.role_changed",
      targetType: "user",
      targetId: updated.user.id,
      summary: `Changed ${updated.user.name ?? updated.user.email} from ${membership.role} to ${data.role}`,
      metadata: { from: membership.role, to: data.role },
    });
  }

  return updated;
}

export async function removeMember(
  teamId: string,
  membershipId: string,
  actorRole: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(actorRole, "ADMIN");
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, teamId },
  });

  if (!membership) {
    throw new AuthError("Member not found", "NOT_FOUND", 404);
  }
  if (membership.role === "OWNER") {
    assertRole(actorRole, "OWNER");
    const owners = await prisma.membership.count({
      where: { teamId, role: "OWNER" },
    });

    if (owners <= 1) {
      throw new AuthError("Cannot remove the last owner", "LAST_OWNER", 400);
    }
  }
  const removed = await prisma.user.findUnique({
    where: { id: membership.userId },
    select: { name: true, email: true },
  });

  await prisma.membership.delete({ where: { id: membershipId } });
  await recordAudit({
    teamId,
    actor,
    action: "member.removed",
    targetType: "user",
    targetId: membership.userId,
    summary: `Removed ${removed?.name ?? removed?.email ?? "a member"} (${membership.role})`,
    metadata: { role: membership.role },
  });
}

export async function createInvite(
  teamId: string,
  invitedById: string,
  input: unknown,
  actorRole: Role,
  origin: string,
) {
  assertRole(actorRole, "ADMIN");
  const data = inviteSchema.parse(input);
  const email = data.email.toLowerCase();

  const existingMember = await prisma.membership.findFirst({
    where: { teamId, user: { email } },
  });

  if (existingMember) {
    throw new AuthError("User is already a member", "ALREADY_MEMBER", 409);
  }

  const token = randomToken(24);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  const inviter = await prisma.user.findUnique({ where: { id: invitedById } });

  const invite = await prisma.invite.create({
    data: {
      teamId,
      email,
      role: data.role,
      tokenHash,
      expiresAt,
      invitedById,
    },
  });

  await recordAudit({
    teamId,
    actor: inviter
      ? { id: inviter.id, name: inviter.name, email: inviter.email }
      : { id: invitedById },
    action: "invite.created",
    targetType: "invite",
    targetId: invite.id,
    summary: `Invited ${email} as ${data.role}`,
    metadata: { email, role: data.role },
  });

  const inviteUrl = `${origin}/invite/${token}`;
  const emailResult = await sendInviteEmail({
    to: email,
    teamName: team.name,
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

export async function resendInvite(
  teamId: string,
  inviteId: string,
  actorRole: Role,
  origin: string,
) {
  assertRole(actorRole, "ADMIN");
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, teamId, acceptedAt: null },
  });

  if (!invite) throw new AuthError("Invite not found", "NOT_FOUND", 404);

  const token = randomToken(24);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  const inviter = await prisma.user.findUnique({
    where: { id: invite.invitedById },
  });

  await prisma.invite.update({
    where: { id: invite.id },
    data: { tokenHash, expiresAt },
  });

  const inviteUrl = `${origin}/invite/${token}`;
  const emailResult = await sendInviteEmail({
    to: invite.email,
    teamName: team.name,
    inviteUrl,
    inviterName: inviter?.name,
  });

  return {
    inviteUrl,
    emailSent: emailResult.sent,
    emailError: emailResult.error,
  };
}

export async function listInvites(teamId: string) {
  return prisma.invite.findMany({
    where: { teamId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeInvite(
  teamId: string,
  inviteId: string,
  actorRole: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(actorRole, "ADMIN");
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, teamId },
  });

  if (!invite) {
    throw new AuthError("Invite not found", "NOT_FOUND", 404);
  }
  await prisma.invite.delete({ where: { id: inviteId } });
  await recordAudit({
    teamId,
    actor,
    action: "invite.revoked",
    targetType: "invite",
    targetId: inviteId,
    summary: `Revoked the invite for ${invite.email}`,
    metadata: { email: invite.email },
  });
}

export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string,
) {
  const tokenHash = await sha256(token);
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: { team: true },
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
    await tx.membership.upsert({
      where: { userId_teamId: { userId, teamId: invite.teamId } },
      create: { userId, teamId: invite.teamId, role: invite.role },
      update: {},
    });
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  return invite.team;
}
