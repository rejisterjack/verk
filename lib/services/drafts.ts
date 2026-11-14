import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  type DraftFields,
  draftTitle,
  draftToIssueInput,
  isBlankDraft,
  MAX_DRAFTS_PER_USER,
  sanitizeDraftFields,
} from "@/lib/drafts";
import { AuthError } from "@/lib/errors";
import { createIssue } from "@/lib/services/issues";

/** Every query is scoped to the author: a draft is private even from team admins. */
export async function listDrafts(teamId: string, userId: string) {
  const rows = await prisma.issueDraft.findMany({
    where: { teamId, userId },
    orderBy: { updatedAt: "desc" },
    take: MAX_DRAFTS_PER_USER,
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    fields: sanitizeDraftFields(row.fields),
    updatedAt: row.updatedAt,
  }));
}

export async function countDrafts(teamId: string, userId: string) {
  return prisma.issueDraft.count({ where: { teamId, userId } });
}

/** Create a draft, or update `draftId` when it is yours. Blank drafts are refused. */
export async function saveDraft(
  teamId: string,
  userId: string,
  input: unknown,
  draftId?: string | null,
) {
  const fields = sanitizeDraftFields(input);

  if (isBlankDraft(fields)) {
    throw new AuthError(
      "Add a title or description before saving a draft",
      "BAD_REQUEST",
      400,
    );
  }
  const data = {
    title: draftTitle(fields),
    fields: fields as unknown as Prisma.InputJsonValue,
  };

  if (draftId) {
    const existing = await prisma.issueDraft.findFirst({
      where: { id: draftId, teamId, userId },
      select: { id: true },
    });

    if (!existing) throw new AuthError("Draft not found", "NOT_FOUND", 404);

    return prisma.issueDraft.update({ where: { id: draftId }, data });
  }
  const count = await prisma.issueDraft.count({ where: { teamId, userId } });

  if (count >= MAX_DRAFTS_PER_USER) {
    throw new AuthError(
      `You can keep up to ${MAX_DRAFTS_PER_USER} drafts. Delete or publish one first.`,
      "LIMIT",
      409,
    );
  }

  return prisma.issueDraft.create({ data: { teamId, userId, ...data } });
}

export async function deleteDraft(
  teamId: string,
  userId: string,
  draftId: string,
) {
  const result = await prisma.issueDraft.deleteMany({
    where: { id: draftId, teamId, userId },
  });

  if (!result.count) throw new AuthError("Draft not found", "NOT_FOUND", 404);
}

/**
 * Turn a draft into a real issue with the normal creation rules, then delete it. If creation
 * fails (missing title, a label that no longer exists, ...) the draft is kept untouched.
 */
export async function publishDraft(
  teamId: string,
  userId: string,
  draftId: string,
) {
  const draft = await prisma.issueDraft.findFirst({
    where: { id: draftId, teamId, userId },
  });

  if (!draft) throw new AuthError("Draft not found", "NOT_FOUND", 404);
  const fields: DraftFields = sanitizeDraftFields(draft.fields);
  const issue = await createIssue(teamId, userId, draftToIssueInput(fields));

  await prisma.issueDraft.deleteMany({ where: { id: draftId, userId } });

  return issue;
}
