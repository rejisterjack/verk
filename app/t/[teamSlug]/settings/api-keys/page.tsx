import { notFound } from "next/navigation";

import { ApiKeysSettings } from "@/components/api-keys-settings";
import { ViewToolbar } from "@/components/page-header";
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
    <div className="px-4 py-3 max-w-3xl space-y-6">
      <ViewToolbar
        description="Use Bearer keys with /api/mcp and the JSON API"
        title="API keys"
      />
      <ApiKeysSettings canAdmin={canAdmin} keys={keys} teamSlug={teamSlug} />
    </div>
  );
}
