import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import {
  CreateLabelForm,
  RenameLabelForm,
} from "@/components/labels-settings-forms";
import { ViewToolbar } from "@/components/page-header";
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
  const labels = (await labelsService.listLabels(teamId)).sort((a, b) => {
    const group = (a.group ?? "").localeCompare(b.group ?? "");

    if (group !== 0) return group;

    return a.name.localeCompare(b.name);
  });

  const labelsPath = `/t/${teamSlug}/settings/labels`;

  async function rename(formData: FormData) {
    "use server";
    const group = String(formData.get("group") ?? "").trim();

    await labelsService.updateLabel(teamId, String(formData.get("id")), {
      name: String(formData.get("name") ?? ""),
      group: group || null,
    });
    revalidatePath(labelsPath);
    redirect(labelsPath);
  }

  async function remove(formData: FormData) {
    "use server";
    await labelsService.deleteLabel(teamId, String(formData.get("id")));
    revalidatePath(labelsPath);
    redirect(labelsPath);
  }

  async function create(formData: FormData) {
    "use server";
    await labelsService.createLabel(teamId, {
      name: String(formData.get("name") ?? ""),
      color: String(formData.get("color") ?? "#0f766e"),
      group: String(formData.get("group") ?? "") || undefined,
    });
    revalidatePath(labelsPath);
    redirect(labelsPath);
  }

  return (
    <div className="px-4 py-3 max-w-lg">
      <ViewToolbar
        description="Team-scoped labels for filtering"
        title="Labels"
      />
      <CreateLabelForm action={create} />
      <ul className="divide-y divide-separator rounded-xl border border-separator">
        {labels.map((l) => (
          <li key={l.id} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span
              className="size-3 rounded-full"
              style={{ background: l.color }}
            />
            <RenameLabelForm
              action={rename}
              group={l.group}
              id={l.id}
              name={l.name}
            />
            <form action={remove}>
              <input name="id" type="hidden" value={l.id} />
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
