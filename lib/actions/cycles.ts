"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireTeamBySlug } from "@/lib/rbac";
import * as cyclesService from "@/lib/services/cycles";

export async function createCycleAction(teamSlug: string, formData: FormData) {
  const { team, membership } = await requireTeamBySlug(teamSlug);

  try {
    const cycle = await cyclesService.createCycle(
      team.id,
      {
        name: String(formData.get("name") ?? ""),
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
        isActive: formData.get("isActive") === "on",
      },
      membership.role,
    );

    revalidatePath(`/t/${teamSlug}/cycles`);
    redirect(`/t/${teamSlug}/cycles/${cycle.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;

    return {
      error: error instanceof Error ? error.message : "Failed to create cycle",
    };
  }
}

export async function updateCycleAction(
  teamSlug: string,
  cycleId: string,
  formData: FormData,
) {
  const { team, membership } = await requireTeamBySlug(teamSlug);

  try {
    await cyclesService.updateCycle(
      team.id,
      cycleId,
      {
        name: String(formData.get("name") ?? "") || undefined,
        startDate: formData.get("startDate")
          ? String(formData.get("startDate"))
          : undefined,
        endDate: formData.get("endDate")
          ? String(formData.get("endDate"))
          : undefined,
        isActive: formData.has("isActive")
          ? formData.get("isActive") === "on" ||
            formData.get("isActive") === "true"
          : undefined,
      },
      membership.role,
    );
    revalidatePath(`/t/${teamSlug}/cycles`);
    revalidatePath(`/t/${teamSlug}/cycles/${cycleId}`);

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update cycle",
    };
  }
}

export async function deleteCycleAction(teamSlug: string, cycleId: string) {
  const { team, membership } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await cyclesService.deleteCycle(team.id, cycleId, membership.role);
    revalidatePath(`/t/${teamSlug}/cycles`);
    redirect(`/t/${teamSlug}/cycles`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;

    return {
      error: error instanceof Error ? error.message : "Failed to delete cycle",
    };
  }
}

export async function setActiveCycleAction(teamSlug: string, cycleId: string) {
  const { team, membership } = await requireTeamBySlug(teamSlug);

  try {
    await cyclesService.updateCycle(
      team.id,
      cycleId,
      { isActive: true },
      membership.role,
    );
    revalidatePath(`/t/${teamSlug}/cycles`);

    return { ok: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to activate cycle",
    };
  }
}
