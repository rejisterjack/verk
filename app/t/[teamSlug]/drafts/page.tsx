import { notFound } from "next/navigation";

import { DraftsList } from "@/components/drafts-list";
import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import { listDrafts } from "@/lib/services/drafts";

export default async function DraftsPage({
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
  const drafts = await listDrafts(teamCtx.team.id, teamCtx.user.id!);

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description="Unfinished issues only you can see"
        title="Drafts"
      />
      <DraftsList
        drafts={drafts.map((draft) => ({
          id: draft.id,
          title: draft.title,
          fields: draft.fields,
          updatedAt: draft.updatedAt.toISOString(),
        }))}
        teamSlug={teamSlug}
      />
    </div>
  );
}
