import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { ViewToolbar } from "@/components/page-header";
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
    <div className="px-4 py-3 max-w-lg space-y-4">
      <ViewToolbar
        description="Apply these from the new-issue form"
        title="Templates"
      />
      <CreateTemplateForm action={create} />
      {templates.length === 0 ? (
        <EmptyState
          description="Create a template to speed up new issues."
          title="No templates yet"
        />
      ) : (
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
      )}
    </div>
  );
}
