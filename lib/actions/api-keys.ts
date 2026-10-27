"use server";

import { revalidatePath } from "next/cache";

import { requireTeamBySlug } from "@/lib/rbac";
import * as apiKeysService from "@/lib/services/api-keys";

export async function createApiKeyAction(teamSlug: string, formData: FormData) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    const result = await apiKeysService.createApiKey(
      team.id,
      user.id,
      { name: String(formData.get("name") ?? "") },
      membership.role,
    );

    revalidatePath(`/t/${teamSlug}/settings/api-keys`);

    return {
      ok: true,
      plaintext: result.plaintext,
      prefix: result.apiKey.prefix,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create key",
    };
  }
}

export async function revokeApiKeyAction(teamSlug: string, keyId: string) {
  const { team, membership } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await apiKeysService.revokeApiKey(team.id, keyId, membership.role);
    revalidatePath(`/t/${teamSlug}/settings/api-keys`);

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to revoke key",
    };
  }
}
