"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { AuthError, assertRole, requireUser } from "@/lib/rbac";
import * as workspaces from "@/lib/services/workspaces";

async function requireWorkspace(
  slug: string,
  minRole: "ADMIN" | "MEMBER" = "ADMIN",
) {
  const user = await requireUser();
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: { workspace: true },
  });

  if (!membership) {
    throw new AuthError("Not a workspace member", "FORBIDDEN", 403);
  }
  assertRole(membership.role, minRole);

  return { user, membership, workspace: membership.workspace };
}

function originFrom(hostHeader: string | null, protoHeader: string | null) {
  const host = hostHeader ?? "localhost:3000";
  const proto = protoHeader ?? "http";

  return process.env.AUTH_URL ?? `${proto}://${host}`;
}

export async function inviteWorkspaceMemberAction(
  workspaceSlug: string,
  formData: FormData,
) {
  try {
    const { user, membership, workspace } =
      await requireWorkspace(workspaceSlug);
    const h = await headers();
    const result = await workspaces.createWorkspaceInvite(
      workspace.id,
      user.id!,
      {
        email: String(formData.get("email") ?? ""),
        role: String(formData.get("role") ?? "MEMBER"),
      },
      membership.role,
      originFrom(
        h.get("x-forwarded-host") ?? h.get("host"),
        h.get("x-forwarded-proto"),
      ),
    );

    revalidatePath(`/w/${workspaceSlug}`);

    return {
      ok: true as const,
      inviteUrl: result.inviteUrl,
      emailSent: result.emailSent,
      emailError: result.emailError,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to invite",
    };
  }
}

export async function updateWorkspaceMemberRoleAction(
  workspaceSlug: string,
  membershipId: string,
  formData: FormData,
) {
  try {
    const { membership, workspace } = await requireWorkspace(workspaceSlug);

    await workspaces.updateWorkspaceMemberRole(
      workspace.id,
      membershipId,
      { role: String(formData.get("role") ?? "MEMBER") },
      membership.role,
    );
    revalidatePath(`/w/${workspaceSlug}`);

    return { ok: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update role",
    };
  }
}

export async function removeWorkspaceMemberAction(
  workspaceSlug: string,
  membershipId: string,
) {
  try {
    const { membership, workspace } = await requireWorkspace(workspaceSlug);

    await workspaces.removeWorkspaceMember(
      workspace.id,
      membershipId,
      membership.role,
    );
    revalidatePath(`/w/${workspaceSlug}`);

    return { ok: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}

export async function revokeWorkspaceInviteAction(
  workspaceSlug: string,
  inviteId: string,
) {
  try {
    const { membership, workspace } = await requireWorkspace(workspaceSlug);

    await workspaces.revokeWorkspaceInvite(
      workspace.id,
      inviteId,
      membership.role,
    );
    revalidatePath(`/w/${workspaceSlug}`);

    return { ok: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to revoke invite",
    };
  }
}

export async function acceptWorkspaceInviteAction(token: string) {
  const user = await requireUser();

  if (!user.email || !user.id) {
    return { error: "Your account needs an email address" };
  }
  try {
    const workspace = await workspaces.acceptWorkspaceInvite(
      token,
      user.id,
      user.email,
    );

    const { redirect } = await import("next/navigation");

    redirect(`/w/${workspace.slug}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;

    return {
      error: error instanceof Error ? error.message : "Failed to accept invite",
    };
  }
}
