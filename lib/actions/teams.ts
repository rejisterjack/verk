"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireTeamBySlug, requireUser } from "@/lib/rbac";
import * as teamsService from "@/lib/services/teams";
import { listUserTeams } from "@/lib/rbac";
import { acceptInvite } from "@/lib/services/members";

export async function createTeamAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "") || undefined;
  const team = await teamsService.createTeam({ name, slug });

  redirect(`/t/${team.slug}/issues`);
}

export async function updateTeamAction(teamSlug: string, formData: FormData) {
  const { team, membership } = await requireTeamBySlug(teamSlug, "ADMIN");
  const name = String(formData.get("name") ?? "") || undefined;
  const slug = String(formData.get("slug") ?? "") || undefined;
  const weeksRaw = String(formData.get("cycleDurationWeeks") ?? "");
  const cycleDurationWeeks = weeksRaw
    ? Number.parseInt(weeksRaw, 10)
    : undefined;

  try {
    const updated = await teamsService.updateTeam(
      team.id,
      {
        name,
        slug,
        ...(cycleDurationWeeks != null && Number.isFinite(cycleDurationWeeks)
          ? { cycleDurationWeeks }
          : {}),
      },
      membership.role,
    );

    revalidatePath(`/t/${teamSlug}`);
    if (updated.slug !== teamSlug) {
      redirect(`/t/${updated.slug}/settings`);
    }

    return { ok: true };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;

    return {
      error: error instanceof Error ? error.message : "Failed to update team",
    };
  }
}

export async function deleteTeamAction(teamSlug: string, formData: FormData) {
  const confirm = String(formData.get("confirm") ?? "");
  const { team, membership } = await requireTeamBySlug(teamSlug, "OWNER");

  if (confirm !== team.slug) {
    return { error: "Type the team slug to confirm deletion" };
  }
  try {
    await teamsService.deleteTeam(team.id, membership.role);
    redirect("/onboarding");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;

    return {
      error: error instanceof Error ? error.message : "Failed to delete team",
    };
  }
}

export async function acceptInviteAction(token: string) {
  const user = await requireUser();

  if (!user.email) {
    return { error: "Your account needs an email address" };
  }
  try {
    const team = await acceptInvite(token, user.id, user.email);

    redirect(`/t/${team.slug}/issues`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;

    return {
      error: error instanceof Error ? error.message : "Failed to accept invite",
    };
  }
}

export async function getMyTeamsAction() {
  const user = await requireUser();

  return listUserTeams(user.id);
}
