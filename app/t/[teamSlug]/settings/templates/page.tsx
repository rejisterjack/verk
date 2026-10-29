import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
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
    <div className="max-w-lg space-y-4">
      <PageHeader description="Apply these from the new-issue form" title="Templates" />
      <form action={create} className="space-y-2">
        <input required className="w-full rounded-lg border border-separator px-3 py-2 text-sm" name="name" placeholder="Template name" />
        <input required className="w-full rounded-lg border border-separator px-3 py-2 text-sm" name="title" placeholder="Issue title" />
        <textarea className="min-h-20 w-full rounded-lg border border-separator px-3 py-2 text-sm" name="description" placeholder="Description" />
        <input className="w-full rounded-lg border border-separator px-3 py-2 text-sm" name="priority" placeholder="Priority (NONE, URGENT, HIGH, MEDIUM, LOW)" />
        <input className="w-full rounded-lg border border-separator px-3 py-2 text-sm" name="estimate" placeholder="Estimate (NONE, S, M, L)" />
        <Button type="submit">Save template</Button>
      </form>
      <ul className="space-y-3 text-sm">
        {templates.map((template) => (
          <li key={template.id} className="rounded-lg border border-separator p-3">
            <form
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
              className="space-y-2"
            >
              <input className="w-full rounded border border-separator px-2 py-1" defaultValue={template.name} name="name" required />
              <input className="w-full rounded border border-separator px-2 py-1" defaultValue={template.title} name="title" required />
              <textarea className="min-h-16 w-full rounded border border-separator px-2 py-1" defaultValue={template.description} name="description" />
              <input className="w-full rounded border border-separator px-2 py-1" defaultValue={template.priority} name="priority" />
              <input className="w-full rounded border border-separator px-2 py-1" defaultValue={template.estimate} name="estimate" />
              <Button size="sm" type="submit">Update</Button>
            </form>
            <form
              action={async () => {
                "use server";
                await deleteTemplate(teamId, template.id);
                redirect(`/t/${teamSlug}/settings/templates`);
              }}
              className="mt-2"
            >
              <Button size="sm" type="submit" variant="danger">Delete</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
