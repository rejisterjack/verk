"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseRetention } from "@/lib/privacy";
import { requireTeamBySlug } from "@/lib/rbac";

/** How long this team keeps audit entries. Admins only; the change itself is logged. */
export async function setAuditRetentionAction(
  teamSlug: string,
  formData: FormData,
) {
  const { team, user } = await requireTeamBySlug(teamSlug, "ADMIN");
  const days = parseRetention(formData.get("days"));

  await prisma.team.update({
    where: { id: team.id },
    data: { auditRetentionDays: days },
  });
  await recordAudit({
    teamId: team.id,
    action: "team.updated",
    actor: user,
    summary:
      days === 0
        ? "Set audit log retention to keep forever"
        : `Set audit log retention to ${days} days`,
    metadata: { auditRetentionDays: days },
  });
  revalidatePath(`/t/${teamSlug}/settings/audit`);
}
