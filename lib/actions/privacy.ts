"use server";

import bcrypt from "bcryptjs";

import { signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/rate-limit";
import { requireUser } from "@/lib/rbac";
import { eraseAccount } from "@/lib/services/privacy";
import { isDemoMode } from "@/lib/utils";

/**
 * Permanently erase your own account. Password accounts must type their password; accounts that
 * sign in through a provider must type their email address. Throttled hard, and off on the demo.
 */
export async function eraseAccountAction(confirmation: string) {
  if (isDemoMode()) {
    return { error: "Account erasure is disabled on the public demo." };
  }
  const user = await requireUser();
  const attempt = await rateLimitShared(`erase:${user.id}`, 5, 60 * 60_000);

  if (!attempt.ok) return { error: "Too many attempts. Try again later." };
  const row = await prisma.user.findUnique({ where: { id: user.id } });

  if (!row) return { error: "Account not found" };
  const confirmed = row.passwordHash
    ? await bcrypt.compare(confirmation, row.passwordHash)
    : confirmation.trim().toLowerCase() === row.email.toLowerCase();

  if (!confirmed) {
    return {
      error: row.passwordHash
        ? "That password is not right."
        : "Type your email address exactly to confirm.",
    };
  }
  try {
    await eraseAccount(user.id);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not erase the account",
    };
  }
  await signOut({ redirectTo: "/" });
}
