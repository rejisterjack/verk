import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import {
  anonymousEmail,
  DELETED_USER_NAME,
  erasureBlockers,
} from "@/lib/privacy";

/**
 * Everything Verk holds about one person, as JSON they can keep: their profile, memberships,
 * sign-in methods (names only, never secrets), and the content they wrote. Secrets such as the
 * password hash, TOTP secret, key hashes and passkey keys are never included.
 */
export async function exportMyData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      accounts: { select: { provider: true } },
      memberships: {
        select: {
          role: true,
          createdAt: true,
          team: { select: { name: true, slug: true } },
        },
      },
      apiKeys: {
        select: {
          name: true,
          prefix: true,
          role: true,
          createdAt: true,
          revokedAt: true,
        },
      },
      passkeys: { select: { name: true, createdAt: true, lastUsedAt: true } },
      twoFactor: { select: { enabledAt: true } },
      notificationPreference: { select: { mutedTypes: true } },
    },
  });

  if (!user) throw new AuthError("Account not found", "NOT_FOUND", 404);
  const [issues, comments, drafts] = await Promise.all([
    prisma.issue.findMany({
      where: { creatorId: userId },
      select: {
        number: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        team: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20_000,
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      select: {
        body: true,
        createdAt: true,
        issue: { select: { number: true, team: { select: { slug: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20_000,
    }),
    prisma.issueDraft.findMany({
      where: { userId },
      select: { title: true, fields: true, updatedAt: true },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      signInMethods: user.accounts.map((a) => a.provider),
      twoFactorEnabled: Boolean(user.twoFactor?.enabledAt),
      passkeys: user.passkeys,
      mutedNotificationTypes: user.notificationPreference?.mutedTypes ?? [],
    },
    teams: user.memberships.map((m) => ({
      team: m.team.name,
      slug: m.team.slug,
      role: m.role,
      joinedAt: m.createdAt,
    })),
    apiKeys: user.apiKeys,
    issuesCreated: issues.map((i) => ({
      key: `${i.team.slug.slice(0, 3).toUpperCase()}-${i.number}`,
      title: i.title,
      description: i.description,
      status: i.status,
      priority: i.priority,
      createdAt: i.createdAt,
    })),
    comments: comments.map((c) => ({
      issue: `${c.issue.team.slug.slice(0, 3).toUpperCase()}-${c.issue.number}`,
      body: c.body,
      createdAt: c.createdAt,
    })),
    drafts,
  };
}

/**
 * Erase an account. Identity is removed but the row stays, so issues and comments the person
 * wrote keep working for their team and show "Deleted user". Needs the current password for
 * password accounts; refuses while the person is the only owner of a team.
 */
export async function eraseAccount(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: {
      role: true,
      teamId: true,
      team: { select: { name: true } },
    },
  });
  const withOwners = await Promise.all(
    memberships.map(async (m) => ({
      teamName: m.team.name,
      role: m.role,
      owners: await prisma.membership.count({
        where: { teamId: m.teamId, role: "OWNER" },
      }),
    })),
  );
  const blockers = erasureBlockers(withOwners);

  if (blockers.length) {
    throw new AuthError(blockers.join(" "), "CONFLICT", 409);
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.apiKey.deleteMany({ where: { createdById: userId } }),
    prisma.passkey.deleteMany({ where: { userId } }),
    prisma.twoFactor.deleteMany({ where: { userId } }),
    prisma.issueDraft.deleteMany({ where: { userId } }),
    prisma.insightReport.deleteMany({
      where: { ownerId: userId, shared: false },
    }),
    prisma.agentClaim.deleteMany({ where: { agentUserId: userId } }),
    prisma.issueSubscription.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.membership.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        name: DELETED_USER_NAME,
        email: anonymousEmail(userId),
        emailVerified: null,
        image: null,
        passwordHash: null,
        disabled: true,
      },
    }),
  ]);
}
