import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import {
  TeamDeleteForm,
  TeamSettingsForm,
} from "@/components/team-settings-form";
import { SettingsNav } from "@/components/settings-nav";
import { deleteTeamAction, updateTeamAction } from "@/lib/actions/teams";
import { isDemoMode } from "@/lib/utils";
import { requireTeamBySlug } from "@/lib/rbac";
import { listMembers } from "@/lib/services/members";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }
  const { team, membership } = teamCtx;
  const canAdmin = membership.role === "ADMIN" || membership.role === "OWNER";
  const members = canAdmin ? await listMembers(team.id) : [];

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="Team settings" />

      <SettingsNav canAdmin={canAdmin} teamSlug={teamSlug} />

      {canAdmin ? (
        <TeamSettingsForm
          action={async (formData) => {
            "use server";
            await updateTeamAction(teamSlug, formData);
          }}
          members={members}
          team={team}
        />
      ) : (
        <p className="text-muted text-sm">
          {team.name} · Only admins can edit team settings.
        </p>
      )}

      {membership.role === "OWNER" && !isDemoMode() ? (
        <TeamDeleteForm
          action={async (formData) => {
            "use server";
            await deleteTeamAction(teamSlug, formData);
          }}
          teamSlug={team.slug}
        />
      ) : null}

      {isDemoMode() ? (
        <p className="text-sm text-muted">
          Demo mode is on — team deletion is disabled. Shared demo data resets
          daily via cron (secret-gated). Do not put real secrets here.
        </p>
      ) : null}
    </div>
  );
}
