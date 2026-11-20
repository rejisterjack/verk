"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireTeamBySlug } from "@/lib/rbac";
import * as surface from "@/lib/services/surface";

function formNullId(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "");

  return value.length ? value : null;
}

function redirectAfter(formData: FormData, fallback: string) {
  const target = String(formData.get("redirectTo") ?? "");

  if (target.startsWith("/t/")) redirect(target);
  revalidatePath(fallback);
}

export async function createDocumentAction(formData: FormData) {
  const teamSlug = String(formData.get("teamSlug") ?? "");
  const { team, user } = await requireTeamBySlug(teamSlug, "MEMBER");

  await surface.saveDocument(team.id, user.id, {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    projectId: formNullId(formData, "projectId"),
    initiativeId: formNullId(formData, "initiativeId"),
  });
  redirectAfter(formData, `/t/${teamSlug}/docs`);
}

export async function updateDocumentAction(formData: FormData) {
  const teamSlug = String(formData.get("teamSlug") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const { team, user } = await requireTeamBySlug(teamSlug, "MEMBER");

  await surface.saveDocument(
    team.id,
    user.id,
    {
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
      baseBody: String(formData.get("baseBody") ?? ""),
      projectId: formNullId(formData, "projectId"),
      initiativeId: formNullId(formData, "initiativeId"),
    },
    documentId,
  );
  redirectAfter(formData, `/t/${teamSlug}/docs`);
}

export async function deleteDocumentAction(formData: FormData) {
  const teamSlug = String(formData.get("teamSlug") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const { team } = await requireTeamBySlug(teamSlug, "MEMBER");

  await surface.deleteDocument(team.id, documentId);
  redirectAfter(formData, `/t/${teamSlug}/docs`);
}

export async function addDocumentCommentAction(formData: FormData) {
  const teamSlug = String(formData.get("teamSlug") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const { team, user } = await requireTeamBySlug(teamSlug, "MEMBER");

  await surface.addDocumentComment(
    team.id,
    documentId,
    user.id,
    String(formData.get("body") ?? ""),
  );
  revalidatePath(`/t/${teamSlug}/docs`);
}