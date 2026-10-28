import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
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
        description="Rename and reorder the five fixed statuses. Adding new status types is post-launch."
        title="Workflow"
      />
      <ul className="space-y-3">
        {statuses.map((s, i) => (
          <li
            key={s.id}
            className="rounded-xl border border-separator p-3 text-sm"
          >
            <form action={rename} className="flex flex-wrap items-end gap-2">
              <input name="id" type="hidden" value={s.id} />
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs text-muted">
                  {s.key} · {s.type}
                </span>
                <input
                  className="rounded-lg border border-separator bg-background px-3 py-2"
                  defaultValue={s.name}
                  name="name"
                />
              </label>
              <Button size="sm" type="submit">
                Rename
              </Button>
            </form>
            <div className="mt-2 flex gap-2">
              <form action={move}>
                <input name="id" type="hidden" value={s.id} />
                <input name="direction" type="hidden" value="up" />
                <Button isDisabled={i === 0} size="sm" type="submit" variant="ghost">
                  Up
                </Button>
              </form>
              <form action={move}>
                <input name="id" type="hidden" value={s.id} />
                <input name="direction" type="hidden" value="down" />
                <Button
                  isDisabled={i === statuses.length - 1}
                  size="sm"
                  type="submit"
                  variant="ghost"
                >
                  Down
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
