import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { ViewToolbar } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import {
  CreateViewForm,
  UpdateViewForm,
} from "@/components/views-settings-forms";
import { requireTeamBySlug } from "@/lib/rbac";
import * as cyclesService from "@/lib/services/cycles";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";
import * as viewsService from "@/lib/services/views";
import * as workspacesService from "@/lib/services/workspaces";

function collectFilters(formData: FormData) {
  const filterJson: Record<string, string> = {};
  const workflowStatusId = String(formData.get("workflowStatusId") ?? "");
  const priority = String(formData.get("priority") ?? "");
  const cycleId = String(formData.get("cycleId") ?? "");
  const assigneeId = String(formData.get("assigneeId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");

  if (workflowStatusId) filterJson.workflowStatusId = workflowStatusId;
  if (priority) filterJson.priority = priority;
  if (cycleId) filterJson.cycleId = cycleId;
  if (assigneeId) filterJson.assigneeId = assigneeId;
  if (projectId) filterJson.projectId = projectId;

  return filterJson;
}

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
  const [views, workflows, cycles, members, projects] = await Promise.all([
    viewsService.listViews(teamId),
    workspacesService.listWorkflowStatuses(teamId),
    cyclesService.listCycles(teamId),
    membersService.listMembers(teamId),
    projectsService.listProjects(teamId),
  ]);

  const workflowOpts = workflows.map((w) => ({ id: w.id, label: w.name }));
  const cycleOpts = cycles.map((c) => ({ id: c.id, label: c.name }));
  const memberOpts = members.map((m) => ({
    id: m.user.id,
    label: m.user.name ?? m.user.email,
  }));
  const projectOpts = projects.map((p) => ({ id: p.id, label: p.name }));

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const layout = String(formData.get("layout") ?? "LIST") as "LIST" | "BOARD";

    if (!name) return;
    await viewsService.createView(teamId, {
      name,
      layout,
      filterJson: collectFilters(formData),
      pinned: true,
    });
    redirect(`/t/${teamSlug}/settings/views`);
  }

  return (
    <div className="max-w-3xl px-4 py-3">
      <ViewToolbar
        description="Saved filters pinned in the sidebar"
        title="Views"
      />
      <CreateViewForm
        action={create}
        cycles={cycleOpts}
        members={memberOpts}
        projects={projectOpts}
        workflows={workflowOpts}
      />
      {views.length === 0 ? (
        <EmptyState
          description="Save a filter from Issues, or create one here."
          title="No saved views yet"
        />
      ) : (
        <ul className="space-y-2 text-sm">
          {views.map((v) => (
            <li
              key={v.id}
              className="space-y-2 rounded-lg border border-separator px-3 py-3"
            >
              <UpdateViewForm
                action={async (formData) => {
                  "use server";
                  await viewsService.updateView(teamId, v.id, {
                    name: String(formData.get("name") ?? v.name),
                    layout: String(formData.get("layout") ?? v.layout),
                    pinned: formData.get("pinned") === "on",
                    filterJson: collectFilters(formData),
                  });
                  redirect(`/t/${teamSlug}/settings/views`);
                }}
                cycles={cycleOpts}
                members={memberOpts}
                projects={projectOpts}
                view={v}
                workflows={workflowOpts}
              />
              <form
                action={async () => {
                  "use server";
                  await viewsService.deleteView(teamId, v.id);
                  redirect(`/t/${teamSlug}/settings/views`);
                }}
              >
                <Button
                  className="h-7 px-2 text-[12px]"
                  size="sm"
                  type="submit"
                  variant="danger"
                >
                  Delete
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
