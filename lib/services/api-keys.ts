import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AuthError, assertRole } from "@/lib/rbac";
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
  const secret = `verk_${randomToken(24)}`;
  const prefix = secret.slice(0, 12);
  const keyHash = await sha256(secret);

  const record = await prisma.apiKey.create({
    data: {
      teamId,
      name: data.name,
      prefix,
      keyHash,
      createdById: userId,
    },
  });

  return { apiKey: record, plaintext: secret };
}

export async function revokeApiKey(
  teamId: string,
  keyId: string,
  actorRole: Role,
) {
  assertRole(actorRole, "ADMIN");
  const key = await prisma.apiKey.findFirst({ where: { id: keyId, teamId } });

  if (!key) {
    throw new AuthError("API key not found", "NOT_FOUND", 404);
  }

  return prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });
}

export async function resolveApiKey(token: string) {
  if (!token.startsWith("verk_")) return null;
  const prefix = token.slice(0, 12);
  const keyHash = await sha256(token);
  const apiKey = await prisma.apiKey.findFirst({
    where: { prefix, keyHash, revokedAt: null },
    include: { team: true, createdBy: true },
  });

  if (apiKey) {
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });
  }

  return apiKey;
}
