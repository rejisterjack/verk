import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";

/**
 * Passkeys (WebAuthn). A passkey needs the device plus a local unlock, so signing in with one
 * counts as two factors and skips the TOTP prompt. The relying-party id and origin come from
 * `AUTH_URL`, so a passkey only works on the site it was made for.
 *
 * Challenges are single-use and live five minutes in `SamlSeen` (the same shared store that stops
 * SAML replays), so they work across serverless instances.
 */

export const MAX_PASSKEYS_PER_USER = 10;
const CHALLENGE_TTL_MS = 5 * 60_000;

function site() {
  const url = new URL(process.env.AUTH_URL ?? "http://localhost:3000");

  return { rpID: url.hostname, origin: url.origin, rpName: "Verk" };
}

async function saveChallenge(key: string, challenge: string) {
  await prisma.samlSeen.deleteMany({ where: { key } });
  await prisma.samlSeen.create({
    data: {
      key,
      value: challenge,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
}

/** Remove and return a challenge. Two attempts can't both use the same one. */
async function takeChallenge(key: string): Promise<string | null> {
  const row = await prisma.samlSeen.findUnique({ where: { key } });

  if (!row) return null;
  const { count } = await prisma.samlSeen.deleteMany({ where: { key } });

  return count === 1 && row.expiresAt > new Date() ? row.value : null;
}

export async function listPasskeys(userId: string) {
  return prisma.passkey.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      deviceType: true,
      backedUp: true,
    },
  });
}

export async function countPasskeys(userId: string) {
  return prisma.passkey.count({ where: { userId } });
}

// ---- adding a passkey -------------------------------------------------------------------

export async function beginRegistration(user: {
  id: string;
  email: string;
  name?: string | null;
}) {
  if ((await countPasskeys(user.id)) >= MAX_PASSKEYS_PER_USER) {
    throw new AuthError(
      `You can keep up to ${MAX_PASSKEYS_PER_USER} passkeys. Remove one first.`,
      "LIMIT",
      409,
    );
  }
  const { rpID, rpName } = site();
  const existing = await prisma.passkey.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: "none",
    // Don't offer to register a device that already has one.
    excludeCredentials: existing.map((passkey) => ({
      id: Buffer.from(passkey.credentialId, "base64url"),
      type: "public-key" as const,
      transports: passkey.transports as never,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });

  await saveChallenge(`passkey-reg:${user.id}`, options.challenge);

  return options;
}

export async function finishRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  name: string,
) {
  const expectedChallenge = await takeChallenge(`passkey-reg:${userId}`);

  if (!expectedChallenge) {
    throw new AuthError(
      "That request expired. Start again.",
      "BAD_REQUEST",
      400,
    );
  }
  const { rpID, origin } = site();
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new AuthError("Could not verify the passkey", "BAD_REQUEST", 400);
  }
  const info = verification.registrationInfo;

  try {
    await prisma.passkey.create({
      data: {
        userId,
        credentialId: Buffer.from(info.credentialID).toString("base64url"),
        publicKey: Buffer.from(info.credentialPublicKey).toString("base64url"),
        counter: info.counter,
        transports: response.response.transports ?? [],
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp,
        name: name.trim().slice(0, 60) || "Passkey",
      },
    });
  } catch {
    throw new AuthError("That passkey is already added", "CONFLICT", 409);
  }
}

export async function removePasskey(userId: string, passkeyId: string) {
  const { count } = await prisma.passkey.deleteMany({
    where: { id: passkeyId, userId },
  });

  if (!count) throw new AuthError("Passkey not found", "NOT_FOUND", 404);
}

// ---- signing in --------------------------------------------------------------------------

/** Start a sign-in. No account is named: the passkey itself says who is signing in. */
export async function beginAuthentication() {
  const { rpID } = site();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
  });

  await saveChallenge(`passkey-auth:${options.challenge}`, options.challenge);

  return options;
}

/**
 * Check a sign-in response. Returns the user id, or null for anything wrong: unknown passkey,
 * expired or reused challenge, bad signature, wrong site, or a counter that went backwards
 * (a cloned authenticator).
 */
export async function finishAuthentication(
  response: AuthenticationResponseJSON,
): Promise<string | null> {
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
  });

  if (!passkey) return null;
  const { rpID, origin } = site();

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: async (challenge) =>
        (await takeChallenge(`passkey-auth:${challenge}`)) !== null,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      authenticator: {
        credentialID: Buffer.from(passkey.credentialId, "base64url"),
        credentialPublicKey: Buffer.from(passkey.publicKey, "base64url"),
        counter: passkey.counter,
        transports: passkey.transports as never,
      },
    });

    if (!verification.verified) return null;
    const next = verification.authenticationInfo.newCounter;

    // Many synced passkeys always report 0. Anything else must move forward.
    if ((next !== 0 || passkey.counter !== 0) && next <= passkey.counter) {
      return null;
    }
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: { counter: next, lastUsedAt: new Date() },
    });

    return passkey.userId;
  } catch {
    return null;
  }
}
