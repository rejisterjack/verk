import { prisma } from "@/lib/db";

/** True when the user exists and has not been deprovisioned (SCIM `active: false`). */
export async function isUserActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { disabled: true },
  });

  return Boolean(user) && !user!.disabled;
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
