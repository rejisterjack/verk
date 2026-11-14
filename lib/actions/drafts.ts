"use server";

import { revalidatePath } from "next/cache";

import { requireTeamBySlug } from "@/lib/rbac";
import * as draftsService from "@/lib/services/drafts";

function formToFields(formData: FormData) {
  const fields: Record<string, unknown> = {};

  for (const key of [
    "title",
    "description",
    "status",
    "workflowStatusId",
    "priority",
    "estimate",
    "dueDate",
    "assigneeId",
    "cycleId",
    "projectId",
    "milestoneId",
  ]) {
    const value = formData.get(key);

    if (value != null && String(value).length) fields[key] = String(value);
  }
  fields.labelIds = formData.getAll("labelIds").map(String).filter(Boolean);

  return fields;
}

/** Save the create form as a draft (or update `draftId`). Guests cannot draft. */
export async function saveDraftAction(
  teamSlug: string,
  formData: FormData,
  draftId?: string | null,
) {
  const { team, user } = await requireTeamBySlug(teamSlug, "MEMBER");

  try {
    const draft = await draftsService.saveDraft(
      team.id,
      user.id,
      formToFields(formData),
      draftId,
    );

    revalidatePath(`/t/${teamSlug}/drafts`);

    return { ok: true as const, id: draft.id };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save the draft",
    };
  }
}

export async function deleteDraftAction(teamSlug: string, draftId: string) {
  const { team, user } = await requireTeamBySlug(teamSlug, "MEMBER");

  try {
    await draftsService.deleteDraft(team.id, user.id, draftId);
    revalidatePath(`/t/${teamSlug}/drafts`);

    return { ok: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not delete the draft",
    };
  }
}

export async function publishDraftAction(teamSlug: string, draftId: string) {
  const { team, user } = await requireTeamBySlug(teamSlug, "MEMBER");

  try {
    const issue = await draftsService.publishDraft(team.id, user.id, draftId);

    revalidatePath(`/t/${teamSlug}/drafts`);
    revalidatePath(`/t/${teamSlug}/issues`);

    return { ok: true as const, number: issue.number };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not publish the draft",
    };
  }
}
