import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import * as viewsService from "@/lib/services/views";

export default async function ViewsSettingsPage({
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

  const teamId = teamCtx.team.id;
  const views = await viewsService.listViews(teamId);

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "");
    const status = String(formData.get("status") ?? "");
    const priority = String(formData.get("priority") ?? "");
    const cycleId = String(formData.get("cycleId") ?? "");
    const assigneeId = String(formData.get("assigneeId") ?? "");
    const projectId = String(formData.get("projectId") ?? "");
    const layout = String(formData.get("layout") ?? "LIST") as "LIST" | "BOARD";
    const filterJson: Record<string, string> = {};

    if (status) filterJson.status = status;
    if (priority) filterJson.priority = priority;
    if (cycleId) filterJson.cycleId = cycleId;
    if (assigneeId) filterJson.assigneeId = assigneeId;
    if (projectId) filterJson.projectId = projectId;

    await viewsService.createView(teamId, {
      name,
      layout,
      filterJson,
      pinned: true,
    });
    redirect(`/t/${teamSlug}/settings/views`);
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        description="Saved filters pinned in the sidebar"
        title="Views"
      />
      <form
        action={create}
        className="mb-6 space-y-2 rounded-xl border border-separator p-4"
      >
        <input
          required
          className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          name="name"
          placeholder="View name"
        />
        <select
          className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          name="status"
        >
          <option value="">Any status</option>
          <option value="BACKLOG">Backlog</option>
          <option value="TODO">Todo</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
        <select className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm" name="priority">
          <option value="">Any priority</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <input className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm" name="cycleId" placeholder="Cycle id (optional)" />
        <input className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm" name="assigneeId" placeholder="Assignee id (optional)" />
        <input className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm" name="projectId" placeholder="Project id (optional)" />
        <select
          className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          name="layout"
        >
          <option value="LIST">List</option>
          <option value="BOARD">Board</option>
        </select>
        <Button type="submit">Save view</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {views.map((v) => (
          <li
            key={v.id}
            className="space-y-2 rounded-lg border border-separator px-3 py-3"
          >
            <form
              action={async (formData) => {
                "use server";
                const filterJson: Record<string, string> = {};
                const status = String(formData.get("status") ?? "");
                const priority = String(formData.get("priority") ?? "");
                const cycleId = String(formData.get("cycleId") ?? "");
                const assigneeId = String(formData.get("assigneeId") ?? "");
                const projectId = String(formData.get("projectId") ?? "");

                if (status) filterJson.status = status;
                if (priority) filterJson.priority = priority;
                if (cycleId) filterJson.cycleId = cycleId;
                if (assigneeId) filterJson.assigneeId = assigneeId;
                if (projectId) filterJson.projectId = projectId;

                await viewsService.updateView(teamId, v.id, {
                  name: String(formData.get("name") ?? v.name),
                  layout: String(formData.get("layout") ?? v.layout),
                  pinned: formData.get("pinned") === "on",
                  filterJson,
                });
                redirect(`/t/${teamSlug}/settings/views`);
              }}
              className="flex flex-wrap items-end gap-2"
            >
              <input
                className="flex-1 rounded-lg border border-separator bg-background px-2 py-1.5"
                defaultValue={v.name}
                name="name"
              />
              <select
                className="rounded-lg border border-separator bg-background px-2 py-1.5"
                defaultValue={String((v.filterJson as { status?: string }).status ?? "")}
                name="status"
              >
                <option value="">Any status</option>
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                className="rounded-lg border border-separator bg-background px-2 py-1.5"
                defaultValue={String((v.filterJson as { priority?: string }).priority ?? "")}
                name="priority"
              >
                <option value="">Any priority</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <input
                className="w-28 rounded-lg border border-separator bg-background px-2 py-1.5"
                defaultValue={String((v.filterJson as { cycleId?: string }).cycleId ?? "")}
                name="cycleId"
                placeholder="Cycle id"
              />
              <input
                className="w-28 rounded-lg border border-separator bg-background px-2 py-1.5"
                defaultValue={String((v.filterJson as { assigneeId?: string }).assigneeId ?? "")}
                name="assigneeId"
                placeholder="Assignee id"
              />
              <input
                className="w-28 rounded-lg border border-separator bg-background px-2 py-1.5"
                defaultValue={String((v.filterJson as { projectId?: string }).projectId ?? "")}
                name="projectId"
                placeholder="Project id"
              />
              <select
                className="rounded-lg border border-separator bg-background px-2 py-1.5"
                defaultValue={v.layout}
                name="layout"
              >
                <option value="LIST">List</option>
                <option value="BOARD">Board</option>
              </select>
              <label className="flex items-center gap-1 text-xs">
                <input
                  defaultChecked={v.pinned}
                  name="pinned"
                  type="checkbox"
                />
                Pinned
              </label>
              <Button size="sm" type="submit">
                Update
              </Button>
            </form>
            <form
              action={async () => {
                "use server";
                await viewsService.deleteView(teamId, v.id);
                redirect(`/t/${teamSlug}/settings/views`);
              }}
            >
              <Button size="sm" type="submit" variant="danger">
                Delete
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
