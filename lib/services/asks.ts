import type { Role } from "@/lib/generated/prisma/client";

import { type AskInput, describeAsk } from "@/lib/asks";
import { type AuditEvent, recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { assertRole } from "@/lib/roles";
import * as issuesService from "@/lib/services/issues";
import { randomToken, sha256 } from "@/lib/utils";

export async function getAskLink(teamId: string, role: Role) {
  assertRole(role, "ADMIN");

  return prisma.askLink.findUnique({
    where: { teamId },
    select: { enabled: true, heading: true, prefix: true, rotatedAt: true },
  });
}

/**
 * Create the link, or replace its token. The token is returned once and stored only as a hash;
 * anyone holding the old one stops working immediately.
 */
export async function rotateAskLink(
  teamId: string,
  role: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(role, "ADMIN");
  const token = `ask_${randomToken(18)}`;

  await prisma.askLink.upsert({
    where: { teamId },
    create: {
      teamId,
      tokenHash: await sha256(token),
      prefix: token.slice(0, 8),
    },
    update: {
      tokenHash: await sha256(token),
      prefix: token.slice(0, 8),
      rotatedAt: new Date(),
      enabled: true,
    },
  });
  await recordAudit({
    teamId,
    actor,
    action: "ask_link.rotated",
    targetType: "ask_link",
    summary: "Created or rotated the public ask link",
  });

  return token;
}

export async function setAskLinkEnabled(
  teamId: string,
  enabled: boolean,
  heading: string | undefined,
  role: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(role, "ADMIN");
  const existing = await prisma.askLink.findUnique({ where: { teamId } });

  if (!existing)
    throw new AuthError("Create the link first", "BAD_REQUEST", 400);
  await prisma.askLink.update({
    where: { teamId },
    data: {
      enabled,
      ...(heading !== undefined
        ? { heading: heading.trim().slice(0, 120) }
        : {}),
    },
  });
  await recordAudit({
    teamId,
    actor,
    action: "ask_link.toggled",
    targetType: "ask_link",
    summary: `${enabled ? "Enabled" : "Disabled"} the public ask link`,
  });
}

/** Resolve a token to its (enabled) team, or null. Used by the public page and endpoint. */
export async function findTeamByAskToken(token: string) {
  if (!/^ask_[a-f0-9]{36}$/.test(token)) return null;
  const link = await prisma.askLink.findUnique({
    where: { tokenHash: await sha256(token) },
    include: { team: { select: { id: true, name: true, slug: true } } },
  });

  if (!link || !link.enabled) return null;

  return { team: link.team, heading: link.heading };
}

/**
 * File a public request as a backlog issue with no assignee, so it appears in triage. It is
 * attributed to the team owner (the issues table needs a creator) and the description says it
 * came from the public link. Nothing the submitter typed is ever treated as markup or a command.
 */
export async function submitAsk(teamId: string, input: AskInput) {
  const owner = await prisma.membership.findFirst({
    where: { teamId, role: "OWNER" },
    select: { userId: true },
  });

  if (!owner)
    throw new AuthError("This team cannot take requests", "NOT_FOUND", 404);

  return issuesService.createIssue(teamId, owner.userId, {
    title: input.title,
    description: describeAsk(input),
    status: "BACKLOG",
  });
}
