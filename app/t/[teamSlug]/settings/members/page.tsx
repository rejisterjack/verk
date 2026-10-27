import NextLink from "next/link";
import { notFound } from "next/navigation";

import { MembersSettings } from "@/components/members-settings";
import { PageHeader } from "@/components/page-header";
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
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Members" />
      <nav className="flex gap-3 text-sm">
        <NextLink
          className="text-muted hover:text-foreground"
          href={`/t/${teamSlug}/settings`}
        >
          General
        </NextLink>
        <NextLink
          className="text-accent"
          href={`/t/${teamSlug}/settings/members`}
        >
          Members
        </NextLink>
        <NextLink
          className="text-muted hover:text-foreground"
          href={`/t/${teamSlug}/settings/api-keys`}
        >
          API keys
        </NextLink>
      </nav>
      <MembersSettings
        canAdmin={canAdmin}
        invites={invites}
        members={members}
        teamSlug={teamSlug}
      />
    </div>
  );
}
