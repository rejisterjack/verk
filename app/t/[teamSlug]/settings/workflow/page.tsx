import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import {
  AddWorkflowStatusForm,
  WorkflowStatusRow,
} from "@/components/workflow-settings-forms";
import { requireTeamBySlug } from "@/lib/rbac";
import * as workspaces from "@/lib/services/workspaces";

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
  const statuses = await workspaces.listWorkflowStatuses(teamId);

  async function addStatus(formData: FormData) {
    "use server";
    await workspaces.createWorkflowStatus(teamId, {
      name: String(formData.get("name") ?? ""),
      key: String(formData.get("key") ?? ""),
      type: String(formData.get("type") ?? "unstarted"),
    });
    redirect(`/t/${teamSlug}/settings/workflow`);
  }

  async function rename(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "");

    await workspaces.renameWorkflowStatus(teamId, id, name);
    redirect(`/t/${teamSlug}/settings/workflow`);
  }

  async function move(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const direction = String(formData.get("direction") ?? "");
    const current = await workspaces.listWorkflowStatuses(teamId);
    const idx = current.findIndex((s) => s.id === id);

    if (idx < 0) return;
    const next = [...current];
    const swapWith = direction === "up" ? idx - 1 : idx + 1;

    if (swapWith < 0 || swapWith >= next.length) return;
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    await workspaces.reorderWorkflowStatuses(
      teamId,
      next.map((s) => s.id),
    );
    redirect(`/t/${teamSlug}/settings/workflow`);
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        description="Rename, reorder, or add a status. New statuses use a workflow key and map onto the nearest built-in column type."
        title="Workflow"
      />
      <AddWorkflowStatusForm action={addStatus} />
      <ul className="space-y-3">
        {statuses.map((s, i) => (
          <WorkflowStatusRow
            key={s.id}
            index={i}
            moveDownAction={move}
            moveUpAction={move}
            renameAction={rename}
            status={s}
            total={statuses.length}
          />
        ))}
      </ul>
    </div>
  );
}
