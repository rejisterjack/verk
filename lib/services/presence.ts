import { prisma } from "@/lib/db";

const FRESH_MS = 60_000;

/** Rows older than this are dead tabs and get deleted on the next heartbeat. */
export const STALE_MS = 10 * 60_000;

export async function beatPresence(issueId: string, userId: string) {
  await prisma.issuePresence.upsert({
    where: { issueId_userId: { issueId, userId } },
    create: { issueId, userId },
    update: { seenAt: new Date() },
  });
  // Best-effort cleanup so closed tabs don't accumulate forever.
  await prisma.issuePresence
    .deleteMany({ where: { seenAt: { lt: new Date(Date.now() - STALE_MS) } } })
    .catch(() => undefined);
}

export async function listPresence(issueId: string, userId: string) {
  const since = new Date(Date.now() - FRESH_MS);
  const rows = await prisma.issuePresence.findMany({
    where: { issueId, seenAt: { gte: since }, NOT: { userId } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { seenAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.user.id,
    name: row.user.name ?? row.user.email,
  }));
}
