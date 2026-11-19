"use server";

import { revalidatePath } from "next/cache";

import { requireTeamBySlug } from "@/lib/rbac";
import { roleAtLeast } from "@/lib/roles";
import * as reports from "@/lib/services/insight-reports";

export async function saveInsightReportAction(
  teamSlug: string,
  formData: FormData,
) {
  const { team, user } = await requireTeamBySlug(teamSlug, "MEMBER");

  try {
    await reports.createReport(team.id, user.id, {
      name: String(formData.get("name") ?? ""),
      measure: String(formData.get("measure") ?? ""),
      dimension: String(formData.get("dimension") ?? ""),
      filter: String(formData.get("filter") ?? ""),
      shared: formData.get("shared") === "on",
    });
    revalidatePath(`/t/${teamSlug}/insights/builder`);

    return { ok: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save the report",
    };
  }
}

export async function deleteInsightReportAction(
  teamSlug: string,
  reportId: string,
) {
  const { team, user, membership } = await requireTeamBySlug(
    teamSlug,
    "MEMBER",
  );

  try {
    await reports.deleteReport(
      team.id,
      user.id,
      reportId,
      roleAtLeast(membership.role, "ADMIN"),
    );
    revalidatePath(`/t/${teamSlug}/insights/builder`);

    return { ok: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not delete the report",
    };
  }
}
