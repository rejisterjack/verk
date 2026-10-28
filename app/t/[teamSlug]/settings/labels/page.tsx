import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import * as labelsService from "@/lib/services/labels";

export default async function LabelsSettingsPage({
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
  const labels = await labelsService.listLabels(teamId);

  async function create(formData: FormData) {
    "use server";
    await labelsService.createLabel(teamId, {
      name: String(formData.get("name") ?? ""),
      color: String(formData.get("color") ?? "#0f766e"),
    });
    redirect(`/t/${teamSlug}/settings/labels`);
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        description="Team-scoped labels for filtering"
        title="Labels"
      />
      <form action={create} className="mb-6 flex gap-2">
        <input
          required
          className="flex-1 rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          name="name"
          placeholder="bug"
        />
        <input
          className="w-24 rounded-lg border border-separator bg-background px-2 py-2 text-sm"
          defaultValue="#0f766e"
          name="color"
          type="color"
        />
        <Button type="submit">Add</Button>
      </form>
      <ul className="divide-y divide-separator rounded-xl border border-separator">
        {labels.map((l) => (
          <li key={l.id} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span
              className="size-3 rounded-full"
              style={{ background: l.color }}
            />
            {l.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
