"use server";

import { revalidatePath } from "next/cache";

import { requireTeamBySlug } from "@/lib/rbac";
import {
  reorderFavorites,
  setFavoriteFolder,
  toggleFavorite,
} from "@/lib/services/favorites";

function refresh(teamSlug: string) {
  revalidatePath(`/t/${teamSlug}`, "layout");
}

export async function toggleFavoriteAction(
  teamSlug: string,
  kind: string,
  targetId: string,
) {
  const { team, user } = await requireTeamBySlug(teamSlug, "GUEST");

  try {
    const result = await toggleFavorite(user.id, team.id, teamSlug, {
      kind,
      targetId,
    });

    refresh(teamSlug);

    return result;
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update favorites",
    };
  }
}

export async function moveFavoriteToFolderAction(
  teamSlug: string,
  favoriteId: string,
  folder: string | null,
) {
  const { user } = await requireTeamBySlug(teamSlug, "GUEST");

  try {
    await setFavoriteFolder(user.id, favoriteId, folder);
    refresh(teamSlug);

    return { ok: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not move favorite",
    };
  }
}

export async function reorderFavoritesAction(
  teamSlug: string,
  orderedIds: string[],
) {
  const { team, user } = await requireTeamBySlug(teamSlug, "GUEST");

  await reorderFavorites(user.id, team.id, orderedIds.slice(0, 200));
  refresh(teamSlug);

  return { ok: true as const };
}
