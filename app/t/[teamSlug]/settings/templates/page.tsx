import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";
import {
  CreateTemplateForm,
  UpdateTemplateForm,
} from "@/components/templates-settings-forms";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
} from "@/lib/services/surface";

export default async function TemplatesPage({
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
  const templates = await listTemplates(teamCtx.team.id);
  const teamId = teamCtx.team.id;
  const canAdmin =
    teamCtx.membership.role === "ADMIN" || teamCtx.membership.role === "OWNER";

  async function create(formData: FormData) {
    "use server";
    await createTemplate(teamId, {
      name: String(formData.get("name") ?? ""),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      priority: String(formData.get("priority") ?? "NONE"),
      estimate: String(formData.get("estimate") ?? "NONE"),
    });
    redirect(`/t/${teamSlug}/settings/templates`);
  }

  return (
    <div className="max-w-lg space-y-4">
      <PageHeader
        description="Apply these from the new-issue form"
        title="Templates"
      />
      <SettingsNav canAdmin={canAdmin} teamSlug={teamSlug} />
      <CreateTemplateForm action={create} />
      <ul className="space-y-3 text-sm">
        {templates.map((template) => (
          <li
            key={template.id}
            className="rounded-lg border border-separator p-3"
          >
            <UpdateTemplateForm
              action={async (formData) => {
                "use server";
                await updateTemplate(teamId, template.id, {
                  name: String(formData.get("name") ?? ""),
                  title: String(formData.get("title") ?? ""),
                  description: String(formData.get("description") ?? ""),
                  priority: String(formData.get("priority") ?? "NONE"),
                  estimate: String(formData.get("estimate") ?? "NONE"),
                });
                redirect(`/t/${teamSlug}/settings/templates`);
              }}
              template={template}
            />
            <form
              action={async () => {
                "use server";
                await deleteTemplate(teamId, template.id);
                redirect(`/t/${teamSlug}/settings/templates`);
              }}
              className="mt-2"
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
