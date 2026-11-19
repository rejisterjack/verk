import { Role } from "@/lib/generated/prisma/client";
import { type AuditEvent, recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { AuthError, assertRole } from "@/lib/rbac";
import { effectiveApiKeyRole, roleAtLeast } from "@/lib/roles";
import { randomToken, sha256 } from "@/lib/utils";
import { createApiKeySchema } from "@/lib/validators";

export async function listApiKeys(teamId: string, actorRole: Role) {
  assertRole(actorRole, "ADMIN");

  return prisma.apiKey.findMany({
    where: { teamId, revokedAt: null },
    select: {
      id: true,
      name: true,
      prefix: true,
      role: true,
      createdAt: true,
      lastUsedAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createApiKey(
  teamId: string,
  userId: string,
  input: unknown,
  actorRole: Role,
) {
  assertRole(actorRole, "ADMIN");
  const data = createApiKeySchema.parse(input);

  // A key can never be more powerful than the person creating it.
  if (!roleAtLeast(actorRole, data.role)) {
    throw new AuthError(
      "A key cannot have a higher role than its creator",
      "FORBIDDEN",
      403,
    );
  }
  const secret = `verk_${randomToken(24)}`;
  const prefix = secret.slice(0, 12);
  const keyHash = await sha256(secret);

  const record = await prisma.apiKey.create({
    data: {
      teamId,
      name: data.name,
      prefix,
      keyHash,
      role: data.role,
      createdById: userId,
    },
  });

  await recordAudit({
    teamId,
    actor: { id: userId },
    action: "api_key.created",
    targetType: "api_key",
    targetId: record.id,
    summary: `Created API key "${data.name}" (${data.role}, ${prefix}…)`,
    metadata: { name: data.name, role: data.role, prefix },
  });

  return { apiKey: record, plaintext: secret };
}

export async function revokeApiKey(
  teamId: string,
  keyId: string,
  actorRole: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(actorRole, "ADMIN");
  const key = await prisma.apiKey.findFirst({ where: { id: keyId, teamId } });

  if (!key) {
    throw new AuthError("API key not found", "NOT_FOUND", 404);
  }

  const revoked = await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  await recordAudit({
    teamId,
    actor,
    action: "api_key.revoked",
    targetType: "api_key",
    targetId: keyId,
    summary: `Revoked API key "${key.name}" (${key.prefix}…)`,
    metadata: { name: key.name, prefix: key.prefix },
  });

  return revoked;
}

/**
 * Resolve a bearer token to its key plus the role it can actually use.
 * `effectiveRole` is the key's role capped by the creator's CURRENT team role,
 * so demoting or removing the creator immediately weakens or kills their keys.
 * Returns null for unknown, revoked, disabled-creator or orphaned keys.
 */
export async function resolveApiKey(token: string) {
  if (!token.startsWith("verk_")) return null;
  const prefix = token.slice(0, 12);
  const keyHash = await sha256(token);
  const apiKey = await prisma.apiKey.findFirst({
    where: { prefix, keyHash, revokedAt: null },
    include: { team: true, createdBy: true },
  });

  // A key whose creator was deprovisioned stops working immediately.
  if (!apiKey || apiKey.createdBy.disabled) return null;

  const membership = await prisma.membership.findUnique({
    where: {
      userId_teamId: { userId: apiKey.createdById, teamId: apiKey.teamId },
    },
    select: { role: true },
  });
  const effectiveRole = effectiveApiKeyRole(apiKey.role, membership?.role);

  // The creator left the team, so the key has no standing.
  if (!effectiveRole) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return { ...apiKey, effectiveRole };
}
