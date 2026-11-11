import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import {
  CreateViewForm,
  UpdateViewForm,
} from "@/components/views-settings-forms";
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
      <CreateViewForm action={create} />
      <ul className="space-y-2 text-sm">
        {views.map((v) => (
          <li
            key={v.id}
            className="space-y-2 rounded-lg border border-separator px-3 py-3"
          >
            <UpdateViewForm
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
              view={v}
            />
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
