"use server";

import { revalidatePath } from "next/cache";

import { requireTeamBySlug } from "@/lib/rbac";
import * as planning from "@/lib/services/planning";

export async function saveCapacityAction(
  teamSlug: string,
  cycleId: string,
  formData: FormData,
) {
  const { team, membership } = await requireTeamBySlug(teamSlug, "MEMBER");

  await planning.saveCycleCapacity(
    team.id,
    cycleId,
    String(formData.get("userId") ?? ""),
    Number(formData.get("points") ?? 0),
    Number(formData.get("daysOff") ?? 0),
    membership.role,
  );
  revalidatePath(`/t/${teamSlug}/cycles/${cycleId}`);
}

export async function linkProjectTeamAction(
  teamSlug: string,
  projectId: string,
  formData: FormData,
) {
  const { team, membership } = await requireTeamBySlug(teamSlug, "ADMIN");

  await planning.linkProjectTeam(
    team.id,
    projectId,
    String(formData.get("teamId") ?? ""),
    membership.role,
  );
  revalidatePath(`/t/${teamSlug}/projects/${projectId}`);
}

export async function createKeyResultAction(
  teamSlug: string,
  initiativeId: string,
  formData: FormData,
) {
  const { team, membership } = await requireTeamBySlug(teamSlug, "MEMBER");

  await planning.createKeyResult(
    team.id,
    initiativeId,
    {
      name: String(formData.get("name") ?? "").trim(),
      target: Number(formData.get("target") ?? 0),
      current: Number(formData.get("current") ?? 0),
      unit: String(formData.get("unit") ?? ""),
    },
    membership.role,
  );
  revalidatePath(`/t/${teamSlug}/initiatives`);
}
