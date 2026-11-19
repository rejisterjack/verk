import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import { addWidget, createDashboard, listDashboards } from "@/lib/services/dashboards";

export default async function DashboardsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }

  const dashboards = await listDashboards(teamCtx.team.id, teamCtx.user.id);
  const canEdit = teamCtx.membership.role !== "GUEST";

  async function create(formData: FormData) {
    "use server";
    const ctx = await requireTeamBySlug(teamSlug, "MEMBER");

    await createDashboard(
      ctx.team.id,
      ctx.user.id,
      String(formData.get("name") ?? "Dashboard"),
      formData.get("shared") === "on",
      ctx.membership.role,
    );
  }

  async function widget(formData: FormData) {
    "use server";
    const ctx = await requireTeamBySlug(teamSlug, "MEMBER");

    await addWidget(
      ctx.team.id,
      String(formData.get("dashboardId") ?? ""),
      {
        kind: String(formData.get("kind") ?? "markdown"),
        title: String(formData.get("title") ?? ""),
        body: String(formData.get("body") ?? ""),
      },
      ctx.membership.role,
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description="Shared dashboards follow the same private-or-shared rule as saved insights."
        title="Dashboards"
      />
      {canEdit ? (
        <form action={create} className="flex gap-2 border-b border-separator px-4 py-3 text-sm">
          <input className="h-8 rounded border border-separator px-2" name="name" placeholder="Name" required />
          <label className="flex items-center gap-1 text-[12px]">
            <input name="shared" type="checkbox" defaultChecked /> Shared
          </label>
          <Button type="submit">Create</Button>
        </form>
      ) : null}
      <div className="space-y-6 px-4 py-3">
        {dashboards.map((dashboard) => (
          <section key={dashboard.id} className="rounded-lg border border-separator p-3">
            <h2 className="font-medium">
              {dashboard.name}{" "}
              <span className="text-[12px] text-muted">{dashboard.shared ? "Shared" : "Private"}</span>
            </h2>
            <ul className="mt-2 space-y-2 text-sm">
              {dashboard.widgets.map((widgetRow) => (
                <li key={widgetRow.id}>
                  <span className="text-muted">{widgetRow.kind}</span> {widgetRow.title || widgetRow.body}
                </li>
              ))}
            </ul>
            {canEdit ? (
              <form action={widget} className="mt-3 flex flex-wrap gap-2 text-sm">
                <input name="dashboardId" type="hidden" value={dashboard.id} />
                <select className="h-8 rounded border border-separator bg-surface px-2" name="kind">
                  <option value="insight">Insight</option>
                  <option value="burndown">Burndown</option>
                  <option value="velocity">Velocity</option>
                  <option value="markdown">Markdown</option>
                </select>
                <input className="h-8 rounded border border-separator px-2" name="title" placeholder="Title" />
                <input className="h-8 min-w-40 rounded border border-separator px-2" name="body" placeholder="Note" />
                <Button type="submit">Add widget</Button>
              </form>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
