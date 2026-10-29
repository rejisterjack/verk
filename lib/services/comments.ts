import { z } from "zod";

import type { Role } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { roleAtLeast } from "@/lib/roles";
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
      reactions: { select: { userId: true, emoji: true } },
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

  await notifyMentions(teamId, issueId, authorId, data.body, issue.title);

  const { dispatchWebhooks } = await import("@/lib/services/webhooks");

  await dispatchWebhooks(teamId, "comment.created", comment);
  const { notifySlack } = await import("@/lib/services/surface");
  const team = await prisma.team.findUnique({ where: { id: teamId } });

  await notifySlack(team?.slackWebhookUrl, `Comment on ${issue.title}`);

  return comment;
}

async function notifyMentions(
  teamId: string,
  issueId: string,
  authorId: string,
  body: string,
  title: string,
) {
  const members = await prisma.membership.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const text = body.toLowerCase();
  const mentioned = members.filter((member) => {
    if (member.userId === authorId) return false;
    const email = member.user.email.toLowerCase();
    const name = (member.user.name ?? "").trim().toLowerCase();

    return (
      text.includes(`@${email}`) || (name.length > 0 && text.includes(`@${name}`))
    );
  });

  if (!mentioned.length) return;

  await prisma.notification.createMany({
    data: mentioned.map((member) => ({
      userId: member.userId,
      teamId,
      issueId,
      type: "MENTIONED" as const,
      title: `Mentioned: ${title}`,
      body: body.slice(0, 200),
    })),
  });
}

export async function deleteComment(
  teamId: string,
  commentId: string,
  userId: string,
  role: Role,
) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId },
    include: { issue: true },
  });

  if (!comment || comment.issue.teamId !== teamId) {
    throw new AuthError("Comment not found", "NOT_FOUND", 404);
  }
  if (comment.authorId !== userId && !roleAtLeast(role, "ADMIN")) {
    throw new AuthError("Cannot delete this comment", "FORBIDDEN", 403);
  }

  await prisma.comment.delete({ where: { id: commentId } });
}
