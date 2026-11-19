import bcrypt from "bcryptjs";

import { recordUserAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import {
  decryptSecret,
  encryptSecret,
  formatSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  otpauthUri,
  verifyTotp,
} from "@/lib/totp";

export async function getTwoFactorStatus(userId: string) {
  const row = await prisma.twoFactor.findUnique({
    where: { userId },
    select: { enabledAt: true, recoveryHashes: true },
  });

  return {
    enabled: Boolean(row?.enabledAt),
    recoveryLeft: row?.enabledAt ? row.recoveryHashes.length : 0,
  };
}

export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const row = await prisma.twoFactor.findUnique({
    where: { userId },
    select: { enabledAt: true },
  });

  return Boolean(row?.enabledAt);
}

/**
 * Start (or restart) enrollment: a new secret, not active until a code from the app confirms it.
 * Refused when 2FA is already on, so an attacker with a session can't silently swap the device.
 */
export async function beginEnrollment(userId: string, account: string) {
  if (await isTwoFactorEnabled(userId)) {
    throw new AuthError(
      "Two-factor sign-in is already on. Turn it off first to set up a new device.",
      "CONFLICT",
      409,
    );
  }
  const secret = generateSecret();

  await prisma.twoFactor.upsert({
    where: { userId },
    create: { userId, secret: encryptSecret(secret), recoveryHashes: [] },
    update: {
      secret: encryptSecret(secret),
      recoveryHashes: [],
      lastStep: 0,
      enabledAt: null,
    },
  });

  return {
    secret: formatSecret(secret),
    uri: otpauthUri(secret, account),
  };
}

/** Confirm enrollment with the first code. Returns the one-time recovery codes. */
export async function confirmEnrollment(userId: string, code: string) {
  const row = await prisma.twoFactor.findUnique({ where: { userId } });

  if (!row || row.enabledAt) {
    throw new AuthError("Start setup first", "BAD_REQUEST", 400);
  }
  const step = verifyTotp(decryptSecret(row.secret), code);

  if (step === null) {
    throw new AuthError(
      "That code is not right. Try the next one.",
      "BAD_REQUEST",
      400,
    );
  }
  const codes = generateRecoveryCodes();

  await prisma.twoFactor.update({
    where: { userId },
    data: {
      enabledAt: new Date(),
      lastStep: step,
      recoveryHashes: codes.map(hashRecoveryCode),
    },
  });

  return { recoveryCodes: codes };
}

/**
 * Check a sign-in code: a 6-digit app code (each time step usable once) or a recovery code
 * (burned when used). Returns false for anything else. Never reveals which part was wrong.
 */
export async function verifySecondFactor(
  userId: string,
  code: string,
): Promise<boolean> {
  const row = await prisma.twoFactor.findUnique({ where: { userId } });

  if (!row?.enabledAt) return true; // nothing to check
  const trimmed = code.trim();

  if (/^\d{3}\s?\d{3}$/.test(trimmed)) {
    const step = verifyTotp(decryptSecret(row.secret), trimmed);

    if (step === null || step <= row.lastStep) return false;
    // Only the request that moves lastStep forward wins; a replay or a race loses.
    const moved = await prisma.twoFactor.updateMany({
      where: { userId, lastStep: { lt: step } },
      data: { lastStep: step },
    });

    return moved.count === 1;
  }
  const hash = hashRecoveryCode(trimmed);

  if (!row.recoveryHashes.includes(hash)) return false;
  const burned = await prisma.twoFactor.updateMany({
    where: { userId, recoveryHashes: { has: hash } },
    data: { recoveryHashes: row.recoveryHashes.filter((h) => h !== hash) },
  });

  if (burned.count === 1) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      await recordUserAudit(user, "two_factor.recovery_used", {
        codesLeft: row.recoveryHashes.length - 1,
      });
    }
  }

  return burned.count === 1;
}

/** Turn 2FA off. Needs the account password (or, for password-less accounts, a valid code). */
export async function disableTwoFactor(
  userId: string,
  proof: { password?: string; code?: string },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (user?.passwordHash) {
    const ok =
      proof.password &&
      (await bcrypt.compare(proof.password, user.passwordHash));

    if (!ok) throw new AuthError("Wrong password", "FORBIDDEN", 403);
  } else if (!proof.code || !(await verifySecondFactor(userId, proof.code))) {
    throw new AuthError(
      "Enter a valid code to turn this off",
      "FORBIDDEN",
      403,
    );
  }
  await prisma.twoFactor.deleteMany({ where: { userId } });
}

/** Replace the recovery codes (password-confirmed by the caller). */
export async function regenerateRecoveryCodes(userId: string) {
  if (!(await isTwoFactorEnabled(userId))) {
    throw new AuthError("Two-factor sign-in is not on", "BAD_REQUEST", 400);
  }
  const codes = generateRecoveryCodes();

  await prisma.twoFactor.update({
    where: { userId },
    data: { recoveryHashes: codes.map(hashRecoveryCode) },
  });

  return codes;
}
