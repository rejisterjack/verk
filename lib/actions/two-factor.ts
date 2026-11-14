"use server";

import { revalidatePath } from "next/cache";

import { recordUserAudit } from "@/lib/audit";
import { rateLimitShared } from "@/lib/rate-limit";
import { requireUser } from "@/lib/rbac";
import * as twoFactor from "@/lib/services/two-factor";

async function guard(action: string) {
  const user = await requireUser();
  const attempt = await rateLimitShared(
    `2fa-${action}:${user.id}`,
    10,
    5 * 60_000,
  );

  if (!attempt.ok)
    throw new Error("Too many attempts. Try again in a few minutes.");

  return user;
}

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Step 1: make a secret and show it (as text and as an otpauth link) for the authenticator app. */
export async function beginTwoFactorAction() {
  try {
    const user = await guard("begin");
    const setup = await twoFactor.beginEnrollment(
      user.id,
      user.email ?? user.id,
    );

    return { ok: true as const, ...setup };
  } catch (error) {
    return { error: message(error, "Could not start setup") };
  }
}

/** Step 2: the first code proves the app works. Returns the recovery codes, shown once. */
export async function confirmTwoFactorAction(code: string) {
  try {
    const user = await guard("confirm");
    const result = await twoFactor.confirmEnrollment(user.id, code);

    await recordUserAudit(user, "two_factor.enabled");
    revalidatePath("/account");

    return { ok: true as const, recoveryCodes: result.recoveryCodes };
  } catch (error) {
    return { error: message(error, "Could not confirm the code") };
  }
}

export async function disableTwoFactorAction(password: string, code: string) {
  try {
    const user = await guard("disable");

    await twoFactor.disableTwoFactor(user.id, { password, code });
    await recordUserAudit(user, "two_factor.disabled");
    revalidatePath("/account");

    return { ok: true as const };
  } catch (error) {
    return { error: message(error, "Could not turn off two-factor sign-in") };
  }
}

export async function regenerateRecoveryCodesAction() {
  try {
    const user = await guard("recovery");
    const codes = await twoFactor.regenerateRecoveryCodes(user.id);

    await recordUserAudit(user, "two_factor.recovery_regenerated");
    revalidatePath("/account");

    return { ok: true as const, recoveryCodes: codes };
  } catch (error) {
    return { error: message(error, "Could not make new codes") };
  }
}
