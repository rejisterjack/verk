"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";

export async function createIssueAction(teamSlug: string, formData: FormData) {
  const { team, user } = await requireTeamBySlug(teamSlug);
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const status = String(formData.get("status") || "BACKLOG");
  const priority = String(formData.get("priority") || "NONE");
  const assigneeId = String(formData.get("assigneeId") || "") || null;
  const cycleId = String(formData.get("cycleId") || "") || null;

  try {
    const issue = await issuesService.createIssue(team.id, user.id, {
      title,
      description,
      status,
      priority,
      assigneeId,
      cycleId,
    });

    revalidatePath(`/t/${teamSlug}/issues`);
    revalidatePath(`/t/${teamSlug}/board`);
    redirect(`/t/${teamSlug}/issues/${issue.number}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;

    return {
      error: error instanceof Error ? error.message : "Failed to create issue",
    };
  }
}

export async function updateIssueAction(
  teamSlug: string,
  issueNumber: number,
  formData: FormData,
) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug);
  const existing = await issuesService.getIssueByNumber(team.id, issueNumber);

  if (!existing) return { error: "Issue not found" };

  const payload: Record<string, unknown> = {};

  for (const key of ["title", "description", "status", "priority"] as const) {
    if (formData.has(key)) payload[key] = String(formData.get(key));
  }
  if (formData.has("assigneeId")) {
    const v = String(formData.get("assigneeId") || "");

    payload.assigneeId = v || null;
  }
  if (formData.has("cycleId")) {
    const v = String(formData.get("cycleId") || "");

    payload.cycleId = v || null;
  }

  try {
    await issuesService.updateIssue(
      team.id,
      existing.id,
      payload,
      membership.role,
      user.id,
    );
    revalidatePath(`/t/${teamSlug}/issues`);
    revalidatePath(`/t/${teamSlug}/board`);
    revalidatePath(`/t/${teamSlug}/issues/${issueNumber}`);

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update issue",
    };
  }
}

export async function deleteIssueAction(teamSlug: string, issueNumber: number) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug);
  const existing = await issuesService.getIssueByNumber(team.id, issueNumber);

  if (!existing) return { error: "Issue not found" };
  try {
    await issuesService.deleteIssue(
      team.id,
      existing.id,
      membership.role,
      user.id,
    );
    revalidatePath(`/t/${teamSlug}/issues`);
    revalidatePath(`/t/${teamSlug}/board`);
    redirect(`/t/${teamSlug}/issues`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;

    return {
      error: error instanceof Error ? error.message : "Failed to delete issue",
    };
  }
}

export async function reorderIssueAction(
  teamSlug: string,
  issueId: string,
  status: string,
  order: number,
) {
  const { team } = await requireTeamBySlug(teamSlug);

  try {
    await issuesService.reorderIssue(team.id, { issueId, status, order });
    revalidatePath(`/t/${teamSlug}/board`);
    revalidatePath(`/t/${teamSlug}/issues`);

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to reorder",
    };
  }
}
