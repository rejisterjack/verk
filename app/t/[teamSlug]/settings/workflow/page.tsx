import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { WorkflowEditor } from "@/components/workflow-editor";
import { requireTeamBySlug } from "@/lib/rbac";
import { getWorkflow, statusIssueCounts } from "@/lib/services/workflow";

export default async function WorkflowSettingsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "ADMIN");
  } catch {
    notFound();
  }

  const teamId = teamCtx.team.id;
  const [statuses, counts] = await Promise.all([
    getWorkflow(teamId),
    statusIssueCounts(teamId),
  ]);

  return (
    <div className="max-w-2xl px-4 py-3">
      <ViewToolbar
        description="Statuses are grouped by type: backlog, unstarted, started, completed, canceled. The type decides what a status means (for example, completed counts as done in cycles and insights). Rename, recolor, reorder within a type, add your own, or delete one by moving its issues to another status of the same type."
        title="Workflow"
      />
      <WorkflowEditor
        statuses={statuses.map((status) => ({
          id: status.id,
          name: status.name,
          key: status.key,
          type: status.type,
          color: status.color,
          count: counts.get(status.id) ?? 0,
        }))}
        teamSlug={teamSlug}
      />
    </div>
  );
}
