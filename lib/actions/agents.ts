"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { requireTeamBySlug } from "@/lib/rbac";
import { forceRelease } from "@/lib/services/agent-claims";
import { updateIssue } from "@/lib/services/issues";

/** An admin frees an issue whose agent is stuck: the claim ends and the issue goes back to Todo. */
export async function forceReleaseClaimAction(
  teamSlug: string,
  issueId: string,
) {
  const { team, user, membership } = await requireTeamBySlug(teamSlug, "ADMIN");

  await forceRelease(team.id, issueId);
  await updateIssue(
    team.id,
    issueId,
    { assigneeId: null, status: "TODO" },
    membership.role,
    user.id,
  );
  await recordAudit({
    teamId: team.id,
    action: "agent_claim.released",
    actor: user,
    targetType: "issue",
    targetId: issueId,
  });
  revalidatePath(`/t/${teamSlug}/settings/agents`);
}
