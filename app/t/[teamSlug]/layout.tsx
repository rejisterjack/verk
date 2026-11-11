import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { KeyboardShell } from "@/components/app/keyboard-shell";
import { GlobalCreateIssue } from "@/components/global-create-issue";
import { auth } from "@/lib/auth";
import { listUserTeams } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { listViews } from "@/lib/services/views";
import {
  ensureWorkspaceForTeam,
  seedDefaultWorkflowStatuses,
} from "@/lib/services/workspaces";

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

  await seedDefaultWorkflowStatuses(team.id).catch(() => undefined);

  const [views, inboxCount] = await Promise.all([
    listViews(team.id).catch(() => []),
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
      <div className="flex min-h-screen">
        <Suspense
          fallback={
            <aside className="w-[var(--sidebar-w)] border-r border-separator" />
          }
        >
          <AppSidebar
            inboxCount={inboxCount}
            role={membership.role}
            teamName={team.name}
            teamSlug={teamSlug}
            teams={memberships.map((m) => ({
              slug: m.team.slug,
              name: m.team.name,
            }))}
            views={views
              .filter((v) => v.pinned)
              .map((v) => ({ id: v.id, name: v.name }))}
            workspaceSlug={workspace?.slug}
          />
        </Suspense>
        <main className="flex min-h-screen flex-1 flex-col overflow-auto">
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
