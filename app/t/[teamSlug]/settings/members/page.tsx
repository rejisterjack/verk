import { notFound } from "next/navigation";

import { MembersSettings } from "@/components/members-settings";
import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import * as membersService from "@/lib/services/members";

export default async function MembersPage({
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

  const [members, invites] = await Promise.all([
    membersService.listMembers(teamCtx.team.id),
    membersService.listInvites(teamCtx.team.id),
  ]);

  const canAdmin =
    teamCtx.membership.role === "ADMIN" || teamCtx.membership.role === "OWNER";

  return (
    <div className="px-4 py-3 max-w-3xl space-y-6">
      <ViewToolbar title="Members" />
      <MembersSettings
        canAdmin={canAdmin}
        invites={invites}
        members={members}
        teamSlug={teamSlug}
      />
    </div>
  );
}
