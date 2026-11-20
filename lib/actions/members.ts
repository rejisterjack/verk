"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireTeamBySlug } from "@/lib/rbac";
import * as membersService from "@/lib/services/members";

export async function inviteMemberAction(teamSlug: string, formData: FormData) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = process.env.AUTH_URL ?? `${proto}://${host}`;

  try {
    const result = await membersService.createInvite(
      team.id,
      user.id,
      {
        email: String(formData.get("email") ?? ""),
        role: String(formData.get("role") ?? "MEMBER"),
      },
      membership.role,
      origin,
    );

    revalidatePath(`/t/${teamSlug}/settings/members`);

    return {
      ok: true,
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

export async function resendInviteAction(teamSlug: string, inviteId: string) {
  const { team, membership } = await requireTeamBySlug(teamSlug, "ADMIN");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = process.env.AUTH_URL ?? `${proto}://${host}`;

  try {
    const result = await membersService.resendInvite(
      team.id,
      inviteId,
      membership.role,
      origin,
    );

    revalidatePath(`/t/${teamSlug}/settings/members`);

    return {
      ok: true,
      inviteUrl: result.inviteUrl,
      emailSent: result.emailSent,
      emailError: result.emailError,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to resend",
    };
  }
}

export async function revokeInviteAction(teamSlug: string, inviteId: string) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await membersService.revokeInvite(team.id, inviteId, membership.role, {
      id: user.id!,
      name: user.name,
      email: user.email,
    });
    revalidatePath(`/t/${teamSlug}/settings/members`);

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to revoke",
    };
  }
}

export async function updateMemberRoleAction(
  teamSlug: string,
  membershipId: string,
  formData: FormData,
) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await membersService.updateMemberRole(
      team.id,
      membershipId,
      { role: String(formData.get("role") ?? "MEMBER") },
      membership.role,
      { id: user.id!, name: user.name, email: user.email },
    );
    revalidatePath(`/t/${teamSlug}/settings/members`);

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update role",
    };
  }
}

export async function leaveTeamAction(teamSlug: string, formData: FormData) {
  const { team, user } = await requireTeamBySlug(teamSlug);
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (confirm !== team.slug) {
    return { error: "Type the team slug to leave." };
  }

  try {
    await membersService.leaveTeam(team.id, user.id!, {
      id: user.id!,
      name: user.name,
      email: user.email,
    });
    revalidatePath(`/t/${teamSlug}/settings/members`);

    return { ok: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not leave the team",
    };
  }
}

export async function removeMemberAction(
  teamSlug: string,
  membershipId: string,
) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await membersService.removeMember(team.id, membershipId, membership.role, {
      id: user.id!,
      name: user.name,
      email: user.email,
    });
    revalidatePath(`/t/${teamSlug}/settings/members`);

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}

/** Limit a guest to specific projects (an empty list gives back the whole team). Admins only. */
export async function setGuestProjectsAction(
  teamSlug: string,
  membershipId: string,
  projectIds: string[],
) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    const { setGuestProjects } = await import("@/lib/services/guest-scope");

    await setGuestProjects(team.id, membershipId, projectIds, membership.role, {
      id: user.id!,
      name: user.name,
      email: user.email,
    });
    revalidatePath(`/t/${teamSlug}/settings/members`);

    return { ok: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save guest access",
    };
  }
}
