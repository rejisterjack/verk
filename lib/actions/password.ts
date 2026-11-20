"use server";

import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/rate-limit";
import { passwordResetSchema } from "@/lib/validators";

export async function changePasswordAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return { error: "Sign in to change your password" };

  const throttle = await rateLimitShared(`auth:change:${userId}`, 10, 60_000);

  if (!throttle.ok) return { error: "Too many attempts. Try again shortly." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return {
      error:
        "This account has no password. Use the provider it was created with.",
    };
  }

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Current password is wrong" };
  }

  const parsed = passwordResetSchema.safeParse({ password: next });

  if (!parsed.success)
    return { error: "Use a password of 8 to 128 characters" };

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      passwordChangedAt: new Date(),
    },
  });

  return { ok: true as const };
}
