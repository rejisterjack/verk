import { notFound } from "next/navigation";

import { GuestAccessSettings } from "@/components/guest-access-settings";
import { MembersSettings } from "@/components/members-settings";
import * as projectsService from "@/lib/services/projects";
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

  const [members, invites, projectList] = await Promise.all([
    membersService.listMembers(teamCtx.team.id),
    membersService.listInvites(teamCtx.team.id),
    projectsService.listProjects(teamCtx.team.id),
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
      {canAdmin ? (
        <GuestAccessSettings
          guests={members
            .filter((m) => m.role === "GUEST")
            .map((m) => ({
              membershipId: m.id,
              label: m.user.name ?? m.user.email,
              projectIds: m.guestProjectIds,
            }))}
          projects={projectList.map((p) => ({ id: p.id, name: p.name }))}
          teamSlug={teamSlug}
        />
      ) : null}
    </div>
  );
}
