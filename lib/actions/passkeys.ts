"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/types";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { recordUserAudit } from "@/lib/audit";
import { isPrivateHost } from "@/lib/auth-allowlist";
import { rateLimitShared } from "@/lib/rate-limit";
import { requireUser } from "@/lib/rbac";
import * as passkeys from "@/lib/services/passkeys";

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function guard(action: string) {
  const user = await requireUser();
  const attempt = await rateLimitShared(
    `passkey-${action}:${user.id}`,
    10,
    5 * 60_000,
  );

  if (!attempt.ok) throw new Error("Too many attempts. Try again shortly.");

  return user;
}

/** Step 1 of adding a passkey: the options the browser needs to create one. */
export async function beginPasskeyAction() {
  try {
    const user = await guard("begin");

    return {
      ok: true as const,
      options: await passkeys.beginRegistration({
        id: user.id,
        email: user.email ?? user.id,
        name: user.name,
      }),
    };
  } catch (error) {
    return { error: message(error, "Could not start adding a passkey") };
  }
}

/** Step 2: check what the browser created and store it. */
export async function finishPasskeyAction(
  response: RegistrationResponseJSON,
  name: string,
) {
  try {
    const user = await guard("finish");

    await passkeys.finishRegistration(user.id, response, name);
    await recordUserAudit(user, "passkey.added");
    revalidatePath("/account");

    return { ok: true as const };
  } catch (error) {
    return { error: message(error, "Could not add the passkey") };
  }
}

export async function removePasskeyAction(passkeyId: string) {
  try {
    const user = await guard("remove");

    await passkeys.removePasskey(user.id, passkeyId);
    await recordUserAudit(user, "passkey.removed");
    revalidatePath("/account");

    return { ok: true as const };
  } catch (error) {
    return { error: message(error, "Could not remove the passkey") };
  }
}

/** Public: start a passkey sign-in. Throttled per visitor, since it needs no account. */
export async function beginPasskeySignInAction() {
  if (isPrivateHost()) return { error: "Passkeys are off on this host" };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const attempt = await rateLimitShared(`passkey-signin:${ip}`, 20, 60_000);

  if (!attempt.ok) return { error: "Too many attempts. Try again shortly." };

  return { ok: true as const, options: await passkeys.beginAuthentication() };
}
