import { prisma } from "@/lib/db";

/** True when the user exists and has not been deprovisioned (SCIM `active: false`). */
export async function isUserActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { disabled: true },
  });

  return Boolean(user) && !user!.disabled;
}

/** ISO time of the last password change, or "" when the password has never been rotated. */
export async function getPasswordStamp(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordChangedAt: true },
  });

  return user?.passwordChangedAt ? user.passwordChangedAt.toISOString() : "";
}

/** True only when a user with this email exists and is disabled. Unknown emails are allowed (new sign-up). */
export async function isEmailDisabled(
  email: string | null | undefined,
): Promise<boolean> {
  if (!email) return false;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { disabled: true },
  });

  return Boolean(user?.disabled);
}
