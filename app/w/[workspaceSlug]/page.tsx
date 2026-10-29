import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createTeamInWorkspace } from "@/lib/services/workspaces";

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
    const name = String(formData.get("name") ?? "").trim();

    if (!name) return;
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
    });
    redirect(`/w/${workspaceSlug}`);
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <PageHeader
        description="Teams in this workspace"
        title={membership.workspace.name}
      />
      <form action={rename} className="mb-4 flex gap-2">
        <input className="flex-1 rounded-lg border border-separator px-3 py-2 text-sm" defaultValue={membership.workspace.name} name="name" />
        <Button type="submit">Rename</Button>
      </form>
      <ul className="mb-6 text-sm text-muted">
        {members.map((member) => (
          <li key={member.id}>
            {member.user.name ?? member.user.email} · {member.role}
          </li>
        ))}
      </ul>
      <form
        action={async (formData) => {
          "use server";
          const name = String(formData.get("name") ?? "").trim();

          if (!name) return;
          const team = await createTeamInWorkspace(workspaceId, name);

          redirect(`/t/${team.slug}/issues`);
        }}
        className="mb-6 flex gap-2"
      >
        <input
          required
          className="flex-1 rounded-lg border border-separator px-3 py-2 text-sm"
          name="name"
          placeholder="New team name"
        />
        <Button type="submit">Add team</Button>
      </form>
      <ul className="divide-y divide-separator rounded-xl border border-separator">
        {membership.workspace.teams.map((team) => (
          <li key={team.id}>
            <NextLink
              className="block px-4 py-3 text-sm hover:bg-default/40"
              href={`/t/${team.slug}/issues`}
            >
              {team.name}
            </NextLink>
          </li>
        ))}
        {membership.workspace.teams.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted">No teams yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
