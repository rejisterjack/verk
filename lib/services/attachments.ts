import { put } from "@vercel/blob";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";

export async function listAttachments(teamId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);

  return prisma.attachment.findMany({
    where: { issueId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAttachment(
  teamId: string,
  issueId: string,
  userId: string,
  file: File,
) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new AuthError(
      "BLOB_READ_WRITE_TOKEN is not configured",
      "BAD_REQUEST",
      400,
    );
  }

  const blob = await put(`verk/${teamId}/${issueId}/${file.name}`, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return prisma.attachment.create({
    data: {
      issueId,
      url: blob.url,
      name: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
      createdById: userId,
    },
  });
}

export async function deleteAttachment(
  teamId: string,
  attachmentId: string,
) {
  const existing = await prisma.attachment.findFirst({
    where: { id: attachmentId },
    include: { issue: true },
  });

  if (!existing || existing.issue.teamId !== teamId) {
    throw new AuthError("Attachment not found", "NOT_FOUND", 404);
  }
  await prisma.attachment.delete({ where: { id: attachmentId } });
}
