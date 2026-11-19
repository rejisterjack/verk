import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { ClarityIdentify } from "@/components/clarity-identify";
import { LiveIssueRefresh } from "@/components/live-issue-refresh";
import { KeyboardShell } from "@/components/app/keyboard-shell";
import { GlobalCreateIssue } from "@/components/global-create-issue";
import { auth } from "@/lib/auth";
import { listUserTeams } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { listFavorites } from "@/lib/services/favorites";
import { ensureWorkspaceForTeam } from "@/lib/services/workspaces";
import { getWorkflow } from "@/lib/services/workflow";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  const team = await prisma.team.findUnique({ where: { slug: teamSlug } });

  if (!team) notFound();

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });

  if (!membership) notFound();

  const memberships = await listUserTeams(session.user.id);

  const workspace = await ensureWorkspaceForTeam(
    team.id,
    session.user.id,
    team.name,
    team.slug,
  ).catch(() => null);

  // Makes sure the team has its statuses (seeds the five defaults for a brand-new team).
  await getWorkflow(team.id).catch(() => undefined);

  const [favorites, inboxCount] = await Promise.all([
    listFavorites(session.user.id, team.id, teamSlug).catch(() => []),
    prisma.notification.count({
      where: {
        userId: session.user.id,
        teamId: team.id,
        readAt: null,
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: new Date() } }],
      },
    }),
  ]);

  return (
    <KeyboardShell teamId={team.id} teamSlug={teamSlug}>
      <ClarityIdentify userId={session.user.id} />
      <div className="flex h-dvh overflow-hidden">
        <Suspense
          fallback={
            <aside className="h-full w-[var(--sidebar-w)] shrink-0 border-r border-separator" />
          }
        >
          <AppSidebar
            favorites={favorites.map((item) => ({
              id: item.id,
              kind: item.kind,
              label: item.label,
              href: item.href,
              folder: item.folder,
            }))}
            inboxCount={inboxCount}
            role={membership.role}
            teamName={team.name}
            teamSlug={teamSlug}
            teams={memberships.map((m) => ({
              slug: m.team.slug,
              name: m.team.name,
            }))}
            workspaceSlug={workspace?.slug}
          />
        </Suspense>
        <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <LiveIssueRefresh teamId={team.id} />
          {children}
        </main>
        {membership.role !== "GUEST" ? (
          <Suspense fallback={null}>
            <GlobalCreateIssue teamId={team.id} teamSlug={teamSlug} />
          </Suspense>
        ) : null}
      </div>
    </KeyboardShell>
  );
}
