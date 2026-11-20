import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { randomToken } from "@/lib/utils";

const RESET_PREFIX = "password-reset:";
const RESET_MS = 30 * 60 * 1000;

export function resetIdentifier(email: string) {
  return `${RESET_PREFIX}${email}`;
}

export function emailFromResetIdentifier(identifier: string) {
  return identifier.startsWith(RESET_PREFIX)
    ? identifier.slice(RESET_PREFIX.length)
    : null;
}

export async function requestPasswordReset(email: string, origin: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, disabled: true },
  });

  if (user?.passwordHash && !user.disabled) {
    const token = randomToken();
    const identifier = resetIdentifier(email);

    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({
      data: {
        identifier,
        token,
        expires: new Date(Date.now() + RESET_MS),
      },
    });

    const resetUrl = `${origin}/reset/${token}`;
    const mailed = await sendPasswordResetEmail({ to: email, resetUrl });

    return { mailed: mailed.sent };
  }

  return { mailed: Boolean(process.env.RESEND_API_KEY) };
}

export async function completePasswordReset(token: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const outcome = await prisma.$transaction(async (tx) => {
    const row = await tx.verificationToken.findUnique({ where: { token } });
    const email = row ? emailFromResetIdentifier(row.identifier) : null;

    if (!row || !email || row.expires.getTime() <= Date.now()) return "invalid";

    const deleted = await tx.verificationToken.deleteMany({
      where: { token, expires: { gt: new Date() } },
    });

    if (deleted.count !== 1) return "invalid";

    const updated = await tx.user.updateMany({
      where: { email },
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    return updated.count === 1 ? "ok" : "invalid";
  });

  if (outcome !== "ok") {
    return {
      ok: false as const,
      error: "This reset link is invalid or expired.",
    };
  }

  return { ok: true as const };
}
