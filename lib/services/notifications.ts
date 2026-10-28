import type { NotificationType } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/db";

export async function ensureSubscribed(issueId: string, userId: string) {
  await prisma.issueSubscription.upsert({
    where: { issueId_userId: { issueId, userId } },
    create: { issueId, userId },
    update: {},
  });
}

export async function notifyIssueSubscribers(opts: {
  teamId: string;
  issueId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  body?: string;
}) {
  const subs = await prisma.issueSubscription.findMany({
    where: { issueId: opts.issueId, userId: { not: opts.actorId } },
    select: { userId: true },
  });

  if (!subs.length) return;

  await prisma.notification.createMany({
    data: subs.map((s) => ({
      userId: s.userId,
      teamId: opts.teamId,
      issueId: opts.issueId,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? "",
    })),
  });
}

export async function listInbox(userId: string, teamId?: string) {
  const now = new Date();

  return prisma.notification.findMany({
    where: {
      userId,
      ...(teamId ? { teamId } : {}),
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
    include: {
      issue: { select: { id: true, number: true, title: true, teamId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function markNotificationRead(userId: string, id: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string, teamId: string) {
  return prisma.notification.updateMany({
    where: { userId, teamId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function snoozeNotification(
  userId: string,
  id: string,
  until: Date,
) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { snoozedUntil: until },
  });
}

export async function deleteNotification(userId: string, id: string) {
  return prisma.notification.deleteMany({ where: { id, userId } });
}
