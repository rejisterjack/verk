import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { randomToken } from "@/lib/utils";

const VERIFY_PREFIX = "email-verify:";
const VERIFY_MS = 24 * 60 * 60 * 1000;

export function verifyIdentifier(email: string) {
  return `${VERIFY_PREFIX}${email}`;
}

export function emailFromVerifyIdentifier(identifier: string) {
  return identifier.startsWith(VERIFY_PREFIX)
    ? identifier.slice(VERIFY_PREFIX.length)
    : null;
}

export async function hasPendingEmailVerification(email: string) {
  const row = await prisma.verificationToken.findFirst({
    where: {
      identifier: verifyIdentifier(email),
      expires: { gt: new Date() },
    },
    select: { token: true },
  });

  return Boolean(row);
}

export async function issueEmailVerification(email: string, origin: string) {
  const token = randomToken();
  const identifier = verifyIdentifier(email);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires: new Date(Date.now() + VERIFY_MS),
    },
  });

  const mailed = await sendVerificationEmail({
    to: email,
    verifyUrl: `${origin}/verify/${token}`,
  });

  return { mailed: mailed.sent };
}

export async function completeEmailVerification(token: string) {
  const outcome = await prisma.$transaction(async (tx) => {
    const row = await tx.verificationToken.findUnique({ where: { token } });
    const email = row ? emailFromVerifyIdentifier(row.identifier) : null;

    if (!row || !email || row.expires.getTime() <= Date.now()) return "invalid";

    const deleted = await tx.verificationToken.deleteMany({
      where: { token, expires: { gt: new Date() } },
    });

    if (deleted.count !== 1) return "invalid";

    const updated = await tx.user.updateMany({
      where: { email },
      data: { emailVerified: new Date() },
    });

    return updated.count === 1 ? "ok" : "invalid";
  });

  return outcome === "ok";
}
