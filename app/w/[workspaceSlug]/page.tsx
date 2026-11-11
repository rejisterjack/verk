import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import {
  AddWorkspaceTeamForm,
  RenameWorkspaceForm,
} from "@/components/workspace-forms";
import { WorkspaceMembers } from "@/components/workspace-members";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { roleAtLeast } from "@/lib/roles";
import {
  createTeamInWorkspace,
  listWorkspaceInvites,
} from "@/lib/services/workspaces";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      workspace: { slug: workspaceSlug },
    },
    include: {
      workspace: {
        include: {
          teams: {
            where: { memberships: { some: { userId: session.user.id } } },
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  if (!membership) notFound();

  const workspaceId = membership.workspace.id;

  async function rename(formData: FormData) {
    "use server";
    const session = await auth();

    if (!session?.user?.id) redirect("/login");
    const actor = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId },
    });

    if (!actor || !roleAtLeast(actor.role, "ADMIN")) return;
    const name = String(formData.get("name") ?? "").trim();

    if (!name) return;
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
    });
    redirect(`/w/${workspaceSlug}`);
  }

  const [members, invites] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    listWorkspaceInvites(workspaceId),
  ]);
  const canAdmin = roleAtLeast(membership.role, "ADMIN");

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col border-x border-separator bg-background">
      <ViewToolbar
        description="Workspace admin"
        title={membership.workspace.name}
      />
      <div className="space-y-4 border-b border-separator px-4 py-3">
        {canAdmin ? (
          <RenameWorkspaceForm
            action={rename}
            name={membership.workspace.name}
          />
        ) : null}
        <WorkspaceMembers
          actorRole={membership.role}
          canAdmin={canAdmin}
          invites={invites.map((invite) => ({
            id: invite.id,
            email: invite.email,
            role: invite.role,
          }))}
          members={members.map((member) => ({
            id: member.id,
            role: member.role,
            user: {
              name: member.user.name,
              email: member.user.email,
            },
          }))}
          workspaceSlug={workspaceSlug}
        />
        {canAdmin ? (
          <AddWorkspaceTeamForm
            action={async (formData) => {
              "use server";
              const session = await auth();

              if (!session?.user?.id) redirect("/login");
              const actor = await prisma.workspaceMember.findFirst({
                where: { userId: session.user.id, workspaceId },
              });

              if (!actor || !roleAtLeast(actor.role, "ADMIN")) return;
              const name = String(formData.get("name") ?? "").trim();

              if (!name) return;
              const team = await createTeamInWorkspace(workspaceId, name);

              redirect(`/t/${team.slug}/issues`);
            }}
          />
        ) : null}
      </div>
      <h2 className="border-b border-separator bg-surface/50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
        Teams
      </h2>
      <ul className="divide-y divide-separator">
        {membership.workspace.teams.map((team) => (
          <li key={team.id}>
            <NextLink
              className="block px-4 py-2 text-[13px] hover:bg-default/40"
              href={`/t/${team.slug}/issues`}
            >
              {team.name}
            </NextLink>
          </li>
        ))}
        {membership.workspace.teams.length === 0 ? (
          <li className="px-4 py-6 text-[13px] text-muted">No teams yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
