import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import { createTemplate, listTemplates } from "@/lib/services/surface";

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
    <div className="max-w-lg space-y-4">
      <PageHeader description="Apply these from the new-issue form" title="Templates" />
      <form action={create} className="space-y-2">
        <input required className="w-full rounded-lg border border-separator px-3 py-2 text-sm" name="name" placeholder="Template name" />
        <input required className="w-full rounded-lg border border-separator px-3 py-2 text-sm" name="title" placeholder="Issue title" />
        <textarea className="min-h-20 w-full rounded-lg border border-separator px-3 py-2 text-sm" name="description" placeholder="Description" />
        <Button type="submit">Save template</Button>
      </form>
      <ul className="text-sm">
        {templates.map((template) => (
          <li key={template.id}>{template.name}: {template.title}</li>
        ))}
      </ul>
    </div>
  );
}
