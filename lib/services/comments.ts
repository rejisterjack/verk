import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { notifyIssueSubscribers } from "@/lib/services/notifications";

const commentSchema = z.object({
  body: z.string().min(1).max(20000),
});

export async function listComments(teamId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);

  return prisma.comment.findMany({
    where: { issueId },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function addComment(
  teamId: string,
  issueId: string,
  authorId: string,
  input: unknown,
) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, teamId },
  });

  if (!issue) throw new AuthError("Issue not found", "NOT_FOUND", 404);
  const data = commentSchema.parse(input);

  await prisma.issueSubscription.upsert({
    where: { issueId_userId: { issueId, userId: authorId } },
    create: { issueId, userId: authorId },
    update: {},
  });

  const comment = await prisma.comment.create({
    data: { issueId, authorId, body: data.body },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await notifyIssueSubscribers({
    teamId,
    issueId,
    actorId: authorId,
    type: "COMMENTED",
    title: `New comment on ${issue.title}`,
    body: data.body.slice(0, 200),
  });

  return comment;
}
