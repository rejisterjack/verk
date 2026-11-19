"use server";

import { revalidatePath } from "next/cache";

import { requireTeamBySlug } from "@/lib/rbac";
import * as asks from "@/lib/services/asks";

export async function rotateAskLinkAction(teamSlug: string) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    const token = await asks.rotateAskLink(team.id, membership.role, {
      id: user.id!,
      name: user.name,
      email: user.email,
    });

    revalidatePath(`/t/${teamSlug}/settings/ask`);

    return { ok: true as const, token };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create the link",
    };
  }
}

export async function setAskLinkAction(
  teamSlug: string,
  enabled: boolean,
  heading: string,
) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await asks.setAskLinkEnabled(team.id, enabled, heading, membership.role, {
      id: user.id!,
      name: user.name,
      email: user.email,
    });
    revalidatePath(`/t/${teamSlug}/settings/ask`);

    return { ok: true as const };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save" };
  }
}
