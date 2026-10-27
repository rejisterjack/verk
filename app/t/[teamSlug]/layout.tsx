import { notFound, redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { auth } from "@/lib/auth";
import { listUserTeams } from "@/lib/rbac";
import { prisma } from "@/lib/db";

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

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        role={membership.role}
        teamSlug={teamSlug}
        teams={memberships.map((m) => ({
          slug: m.team.slug,
          name: m.team.name,
        }))}
      />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
