import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { AskSettings } from "@/components/ask-settings";
import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import { createAskForm, getAskLink, listAskForms } from "@/lib/services/asks";
import { SubmitButton as Button } from "@/components/submit-button";

export default async function AskSettingsPage({
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
  const link = await getAskLink(teamCtx.team.id, teamCtx.membership.role);
  const forms = await listAskForms(teamCtx.team.id);

  async function addForm(formData: FormData) {
    "use server";
    const ctx = await requireTeamBySlug(teamSlug, "ADMIN");
    const fields = ["title", "details", "name", "email", "priority", "label", "project"].filter(
      (field) => formData.get(field) === "on" || field === "title",
    );
    const showField = String(formData.get("showField") ?? "");
    const showEquals = String(formData.get("showEquals") ?? "");

    await createAskForm(
      ctx.team.id,
      String(formData.get("name") ?? "Ask"),
      fields,
      showField && showEquals ? { field: showField, equals: showEquals } : null,
      ctx.membership.role,
    );
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = process.env.AUTH_URL ?? `${proto}://${host}`;

  return (
    <div className="max-w-2xl px-4 py-3">
      <ViewToolbar
        description="A public form anyone can use to send your team a request, with no account. Requests arrive in Triage. Admins only."
        title="Ask link"
      />
      <AskSettings
        link={
          link
            ? {
                enabled: link.enabled,
                heading: link.heading,
                prefix: link.prefix,
              }
            : null
        }
        origin={origin}
        teamSlug={teamSlug}
      />
      <form action={addForm} className="mt-6 space-y-2 text-sm">
        <h2 className="font-medium">Another form</h2>
        <input className="h-8 rounded border border-separator px-2" name="name" placeholder="Name" required />
        <div className="flex flex-wrap gap-3 text-[12px]">
          {["details", "name", "email", "priority", "label", "project"].map((field) => (
            <label key={field} className="inline-flex items-center gap-1">
              <input name={field} type="checkbox" /> {field}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="h-8 rounded border border-separator px-2" name="showField" placeholder="Show if field" />
          <input className="h-8 rounded border border-separator px-2" name="showEquals" placeholder="equals" />
        </div>
        <Button type="submit">Create form</Button>
        <ul className="text-[12px] text-muted">
          {forms.map((form) => (
            <li key={form.id}>
              {form.name} · {form.prefix}
            </li>
          ))}
        </ul>
      </form>
    </div>
  );
}
