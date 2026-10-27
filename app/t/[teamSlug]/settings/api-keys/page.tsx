import NextLink from "next/link";
import { notFound } from "next/navigation";

import { ApiKeysSettings } from "@/components/api-keys-settings";
import { PageHeader } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import * as apiKeysService from "@/lib/services/api-keys";

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "MEMBER");
  } catch {
    notFound();
  }

  const canAdmin =
    teamCtx.membership.role === "ADMIN" || teamCtx.membership.role === "OWNER";

  const keys = canAdmin
    ? await apiKeysService.listApiKeys(teamCtx.team.id, teamCtx.membership.role)
    : [];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        description="Use Bearer keys with /api/mcp and the JSON API"
        title="API keys"
      />
      <nav className="flex gap-3 text-sm">
        <NextLink
          className="text-muted hover:text-foreground"
          href={`/t/${teamSlug}/settings`}
        >
          General
        </NextLink>
        <NextLink
          className="text-muted hover:text-foreground"
          href={`/t/${teamSlug}/settings/members`}
        >
          Members
        </NextLink>
        <NextLink
          className="text-accent"
          href={`/t/${teamSlug}/settings/api-keys`}
        >
          API keys
        </NextLink>
      </nav>
      <ApiKeysSettings canAdmin={canAdmin} keys={keys} teamSlug={teamSlug} />
    </div>
  );
}
