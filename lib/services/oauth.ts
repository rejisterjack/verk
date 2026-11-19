import type { Role } from "@/lib/generated/prisma/client";

import { timingSafeEqual } from "node:crypto";

import { type AuditEvent, recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import {
  CODE_TTL_MS,
  isValidChallenge,
  isValidRedirectUri,
  MAX_REDIRECT_URIS,
  redirectUriAllowed,
  roleForScope,
  verifyPkce,
} from "@/lib/oauth";
import { assertRole } from "@/lib/roles";
import { randomToken, sha256 } from "@/lib/utils";

export async function listOAuthApps(teamId: string, role: Role) {
  assertRole(role, "ADMIN");

  return prisma.oAuthApp.findMany({
    where: { teamId },
    select: {
      id: true,
      name: true,
      clientId: true,
      redirectUris: true,
      createdAt: true,
      clientSecretHash: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createOAuthApp(
  teamId: string,
  userId: string,
  input: { name: string; redirectUris: string[]; confidential?: boolean },
  role: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(role, "ADMIN");
  const name = input.name.trim();
  const uris = [
    ...new Set(input.redirectUris.map((u) => u.trim()).filter(Boolean)),
  ];

  if (!name || name.length > 80) {
    throw new AuthError("Name must be 1 to 80 characters", "BAD_REQUEST", 400);
  }
  if (!uris.length || uris.length > MAX_REDIRECT_URIS) {
    throw new AuthError(
      `Give 1 to ${MAX_REDIRECT_URIS} redirect URIs`,
      "BAD_REQUEST",
      400,
    );
  }
  if (!uris.every(isValidRedirectUri)) {
    throw new AuthError(
      "Redirect URIs must be https (or http on localhost) with no #fragment",
      "BAD_REQUEST",
      400,
    );
  }
  const clientId = `verk_app_${randomToken(12)}`;
  const secret = input.confidential ? `verk_secret_${randomToken(24)}` : null;
  const app = await prisma.oAuthApp.create({
    data: {
      teamId,
      name,
      clientId,
      clientSecretHash: secret ? await sha256(secret) : null,
      redirectUris: uris,
      createdById: userId,
    },
  });

  await recordAudit({
    teamId,
    actor: actor ?? { id: userId },
    action: "oauth_app.created",
    targetType: "oauth_app",
    targetId: app.id,
    summary: `Registered OAuth app "${name}"`,
    metadata: { clientId },
  });

  // The secret is returned once and never stored in the clear.
  return { app, clientSecret: secret };
}

export async function deleteOAuthApp(
  teamId: string,
  appId: string,
  role: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(role, "ADMIN");
  const app = await prisma.oAuthApp.findFirst({ where: { id: appId, teamId } });

  if (!app) throw new AuthError("App not found", "NOT_FOUND", 404);
  // Deleting the app cascades to its codes and to every token it issued.
  await prisma.oAuthApp.delete({ where: { id: appId } });
  await recordAudit({
    teamId,
    actor,
    action: "oauth_app.deleted",
    targetType: "oauth_app",
    targetId: appId,
    summary: `Deleted OAuth app "${app.name}" and revoked its tokens`,
  });
}

/** What the consent screen needs, after checking the request is well formed. */
export async function getAuthorizeRequest(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}) {
  const app = await prisma.oAuthApp.findUnique({
    where: { clientId: params.clientId },
    include: { team: { select: { id: true, name: true, slug: true } } },
  });

  // Until the redirect URI is proven registered we must never redirect to it.
  if (!app || !redirectUriAllowed(app.redirectUris, params.redirectUri)) {
    throw new AuthError("Unknown app or redirect URI", "BAD_REQUEST", 400);
  }
  if (params.codeChallengeMethod !== "S256") {
    throw new AuthError(
      "Only code_challenge_method=S256 is supported",
      "BAD_REQUEST",
      400,
    );
  }
  if (!isValidChallenge(params.codeChallenge)) {
    throw new AuthError("Invalid code_challenge", "BAD_REQUEST", 400);
  }

  return app;
}

/** The signed-in user approved: issue a one-time code bound to this app, URI and challenge. */
export async function issueCode(params: {
  appId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
}) {
  const member = await prisma.oAuthApp.findUnique({
    where: { id: params.appId },
    select: { teamId: true },
  });

  if (!member) throw new AuthError("Unknown app", "BAD_REQUEST", 400);
  const membership = await prisma.membership.findFirst({
    where: { teamId: member.teamId, userId: params.userId },
  });

  if (!membership) {
    throw new AuthError("You are not a member of this team", "FORBIDDEN", 403);
  }
  const code = `verk_code_${randomToken(24)}`;

  await prisma.oAuthCode.create({
    data: {
      codeHash: await sha256(code),
      appId: params.appId,
      userId: params.userId,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      scope: params.scope,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  return code;
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);

  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Exchange a code for a token. The code is deleted first, so it works once even if two
 * requests race. The token is an ordinary API key (so every existing check applies), limited
 * to the role the scope allows and to the user's own current role.
 */
export async function exchangeCode(params: {
  clientId: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const app = await prisma.oAuthApp.findUnique({
    where: { clientId: params.clientId },
  });

  if (!app) throw new AuthError("invalid_client", "UNAUTHORIZED", 401);
  if (app.clientSecretHash) {
    const given = params.clientSecret ? await sha256(params.clientSecret) : "";

    if (!given || !safeEqual(given, app.clientSecretHash)) {
      throw new AuthError("invalid_client", "UNAUTHORIZED", 401);
    }
  }
  const codeHash = await sha256(params.code);
  const row = await prisma.oAuthCode.findUnique({ where: { codeHash } });
  const consumed = row
    ? await prisma.oAuthCode.deleteMany({ where: { codeHash } })
    : { count: 0 };

  if (
    !row ||
    consumed.count !== 1 ||
    row.appId !== app.id ||
    row.expiresAt.getTime() < Date.now() ||
    row.redirectUri !== params.redirectUri ||
    !verifyPkce(params.codeVerifier, row.codeChallenge)
  ) {
    throw new AuthError("invalid_grant", "BAD_REQUEST", 400);
  }
  const membership = await prisma.membership.findFirst({
    where: { teamId: app.teamId, userId: row.userId },
  });

  if (!membership) throw new AuthError("invalid_grant", "BAD_REQUEST", 400);
  const token = `verk_${randomToken(24)}`;

  await prisma.apiKey.create({
    data: {
      teamId: app.teamId,
      name: `OAuth: ${app.name}`,
      prefix: token.slice(0, 12),
      keyHash: await sha256(token),
      role: roleForScope(row.scope),
      createdById: row.userId,
      oauthAppId: app.id,
    },
  });

  return {
    access_token: token,
    token_type: "Bearer",
    scope: row.scope,
    team_id: app.teamId,
  };
}

/** Housekeeping for the daily cron: drop expired, never-redeemed codes. */
export async function pruneOAuthCodes(): Promise<number> {
  const result = await prisma.oAuthCode.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return result.count;
}
