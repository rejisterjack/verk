"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ConflictError } from "@/lib/errors";
import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";
import * as labelsService from "@/lib/services/labels";

function formNullId(formData: FormData, key: string) {
  const v = String(formData.get(key) || "");

  return v || null;
}

function formLabelIds(formData: FormData): string[] {
  return formData
    .getAll("labelIds")
    .map(String)
    .filter((id) => id.length > 0);
}

export async function createIssueAction(teamSlug: string, formData: FormData) {
  const { team, user } = await requireTeamBySlug(teamSlug);
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const status = String(formData.get("status") || "BACKLOG");
  const priority = String(formData.get("priority") || "NONE");
  const estimate = String(formData.get("estimate") || "NONE");
  const dueRaw = String(formData.get("dueDate") || "");
  const assigneeId = formNullId(formData, "assigneeId");
  const cycleId = formNullId(formData, "cycleId");
  const projectId = formNullId(formData, "projectId");
  const milestoneId = formNullId(formData, "milestoneId");
  const workflowStatusId = formNullId(formData, "workflowStatusId");
  const labelIds = formLabelIds(formData);

  try {
    const issue = await issuesService.createIssue(team.id, user.id, {
      title,
      description,
      status,
      priority,
      estimate,
      dueDate: dueRaw ? new Date(dueRaw) : null,
      assigneeId,
      cycleId,
      projectId,
      milestoneId,
      workflowStatusId,
      labelIds,
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

  for (const key of [
    "title",
    "description",
    "status",
    "priority",
    "estimate",
  ] as const) {
    if (formData.has(key)) payload[key] = String(formData.get(key));
  }
  for (const key of ["assigneeId", "cycleId", "projectId"] as const) {
    if (formData.has(key)) payload[key] = formNullId(formData, key);
  }
  if (formData.has("dueDate")) {
    const dueRaw = String(formData.get("dueDate") || "");

    payload.dueDate = dueRaw ? new Date(dueRaw) : null;
  }
  if (formData.has("milestoneId")) {
    payload.milestoneId = formNullId(formData, "milestoneId");
  }
  if (formData.has("workflowStatusId")) {
    payload.workflowStatusId = formNullId(formData, "workflowStatusId");
  }
  if (formData.has("revision")) {
    const revision = Number(formData.get("revision"));

    if (Number.isFinite(revision)) payload.revision = revision;
  }

  try {
    await issuesService.updateIssue(
      team.id,
      existing.id,
      payload,
      membership.role,
      user.id,
    );

    if (formData.get("labelsTouched") === "1") {
      await labelsService.setIssueLabels(
        team.id,
        existing.id,
        formLabelIds(formData),
        user.id,
      );
    }

    revalidatePath(`/t/${teamSlug}/issues`);
    revalidatePath(`/t/${teamSlug}/board`);
    revalidatePath(`/t/${teamSlug}/issues/${issueNumber}`);

    return { ok: true as const };
  } catch (error) {
    if (error instanceof ConflictError) {
      const details = error.details as { issue?: unknown } | undefined;

      return { conflict: true as const, issue: details?.issue ?? null };
    }

    return {
      error: error instanceof Error ? error.message : "Failed to update issue",
    };
  }
}

export async function triageIssueAction(
  teamSlug: string,
  issueId: string,
  action: "accept" | "decline" | "snooze",
) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug);

  if (action === "snooze") {
    const until = new Date(Date.now() + 60 * 60 * 1000);

    await issuesService.snoozeIssueTriage(team.id, issueId, until);
  } else {
    await issuesService.updateIssue(
      team.id,
      issueId,
      { status: action === "accept" ? "TODO" : "CANCELLED" },
      membership.role,
      user.id,
    );
  }

  revalidatePath(`/t/${teamSlug}/triage`);
  revalidatePath(`/t/${teamSlug}/issues`);
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
  workflowStatusId?: string | null,
) {
  const { team } = await requireTeamBySlug(teamSlug);

  try {
    await issuesService.reorderIssue(team.id, {
      issueId,
      status,
      order,
      ...(workflowStatusId ? { workflowStatusId } : {}),
    });
    revalidatePath(`/t/${teamSlug}/board`);
    revalidatePath(`/t/${teamSlug}/issues`);

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to reorder",
    };
  }
}
