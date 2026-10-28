import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { KeyboardShell } from "@/components/app/keyboard-shell";
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

  await ensureWorkspaceForTeam(
    team.id,
    session.user.id,
    team.name,
    team.slug,
  ).catch(() => undefined);
  await seedDefaultWorkflowStatuses(team.id).catch(() => undefined);

  const [views, inboxCount] = await Promise.all([
    listViews(team.id).catch(() => []),
    prisma.notification.count({
      where: {
        userId: session.user.id,
        teamId: team.id,
        readAt: null,
      },
    }),
  ]);

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<aside className="w-56 border-r border-separator" />}>
        <AppSidebar
          inboxCount={inboxCount}
          role={membership.role}
          teamSlug={teamSlug}
          teams={memberships.map((m) => ({
            slug: m.team.slug,
            name: m.team.name,
          }))}
          views={views
            .filter((v) => v.pinned)
            .map((v) => ({ id: v.id, name: v.name }))}
        />
      </Suspense>
      <KeyboardShell teamId={team.id} teamSlug={teamSlug}>
        <main className="flex-1 overflow-auto p-5">{children}</main>
      </KeyboardShell>
    </div>
  );
}
