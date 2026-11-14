"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/rbac";
import { setMutedTypes } from "@/lib/services/notifications";

/** Save which notification types the signed-in user wants muted. `muted` is the full list. */
export async function saveNotificationPrefsAction(
  teamSlug: string,
  muted: string[],
) {
  const user = await requireUser();

  try {
    const saved = await setMutedTypes(user.id, muted);

    revalidatePath(`/t/${teamSlug}/settings/notifications`);

    return { ok: true as const, muted: saved };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save",
    };
  }
}
