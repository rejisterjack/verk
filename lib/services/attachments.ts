import type { Role } from "@/lib/generated/prisma/client";

import { del, put } from "@vercel/blob";

import {
  contentMatchesType,
  MAX_ATTACHMENTS_PER_ISSUE,
  sanitizeFileName,
} from "@/lib/attachment-files";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { roleAtLeast } from "@/lib/roles";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/zip",
]);

export function assertAttachmentFile(file: { size: number; type: string }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new AuthError(
      "Attachments need BLOB_READ_WRITE_TOKEN. Add a Vercel Blob token to enable uploads.",
      "BAD_REQUEST",
      400,
    );
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new AuthError(
      "Attachment must be 10 MB or smaller",
      "BAD_REQUEST",
      400,
    );
  }
  const type = file.type || "application/octet-stream";

  if (!ALLOWED_ATTACHMENT_TYPES.has(type)) {
    throw new AuthError("That file type is not allowed", "BAD_REQUEST", 400);
  }
}

async function noteAttachment(
  teamId: string,
  issueId: string,
  userId: string,
  event: "attachment.created" | "attachment.deleted",
  name: string,
) {
  const { recordActivity } = await import("@/lib/services/surface");
  const { dispatchWebhooks } = await import("@/lib/services/webhooks");

  await recordActivity(issueId, userId, event, "", name);
  await dispatchWebhooks(teamId, event, { issueId, name });
}

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
  role: Role = "MEMBER",
) {
  // Guests may read attachments but not add them.
  if (!roleAtLeast(role, "MEMBER")) {
    throw new AuthError("Guests cannot upload files", "FORBIDDEN", 403);
  }
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  assertAttachmentFile(file);

  const claimed = file.type || "application/octet-stream";
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  // The browser-reported type is only a claim: check the bytes agree with it.
  if (!contentMatchesType(claimed, head)) {
    throw new AuthError(
      "The file's contents do not match its type",
      "BAD_REQUEST",
      400,
    );
  }
  const existing = await prisma.attachment.count({ where: { issueId } });

  if (existing >= MAX_ATTACHMENTS_PER_ISSUE) {
    throw new AuthError(
      `An issue can have up to ${MAX_ATTACHMENTS_PER_ISSUE} attachments`,
      "LIMIT",
      409,
    );
  }
  const name = sanitizeFileName(file.name);
  const blob = await put(`verk/${teamId}/${issueId}/${name}`, file, {
    access: "public",
    // A random suffix stops two files with the same name from overwriting each other.
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const attachment = await prisma.attachment.create({
    data: {
      issueId,
      url: blob.url,
      name,
      size: file.size,
      contentType: claimed,
      createdById: userId,
    },
  });

  await noteAttachment(teamId, issueId, userId, "attachment.created", name);

  return attachment;
}

export async function deleteAttachment(
  teamId: string,
  attachmentId: string,
  userId: string,
  role: Role = "MEMBER",
) {
  const existing = await prisma.attachment.findFirst({
    where: { id: attachmentId },
    include: { issue: true },
  });

  if (!existing || existing.issue.teamId !== teamId) {
    throw new AuthError("Attachment not found", "NOT_FOUND", 404);
  }
  // Only whoever uploaded it, or an admin, may remove it.
  if (existing.createdById !== userId && !roleAtLeast(role, "ADMIN")) {
    throw new AuthError(
      "Only the uploader or an admin can delete this attachment",
      "FORBIDDEN",
      403,
    );
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(existing.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  }
  await prisma.attachment.delete({ where: { id: attachmentId } });
  await noteAttachment(
    teamId,
    existing.issueId,
    userId,
    "attachment.deleted",
    existing.name,
  );
}
