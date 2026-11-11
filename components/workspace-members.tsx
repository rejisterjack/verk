"use client";

import { useState } from "react";

import { SubmitButton as Button } from "@/components/submit-button";
import {
  inviteWorkspaceMemberAction,
  removeWorkspaceMemberAction,
  revokeWorkspaceInviteAction,
  updateWorkspaceMemberRoleAction,
} from "@/lib/actions/workspaces";
import { ROLE_LABELS } from "@/lib/labels";

type RoleName = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

type Member = {
  id: string;
  role: RoleName;
  user: { name: string | null; email: string };
};

type Invite = {
  id: string;
  email: string;
  role: RoleName;
};

const ASSIGNABLE: RoleName[] = ["ADMIN", "MEMBER", "GUEST"];

export function WorkspaceMembers({
  workspaceSlug,
  members,
  invites,
  canAdmin,
  actorRole,
}: {
  workspaceSlug: string;
  members: Member[];
  invites: Invite[];
  canAdmin: boolean;
  actorRole: RoleName;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const roleOptions =
    actorRole === "OWNER"
      ? (["OWNER", ...ASSIGNABLE] as RoleName[])
      : ASSIGNABLE;

  return (
    <div className="mb-6 space-y-4">
      {canAdmin ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;

            setMessage(null);
            setInviteUrl(null);
            const result = await inviteWorkspaceMemberAction(
              workspaceSlug,
              new FormData(form),
            );

            if ("error" in result && result.error) {
              setMessage(result.error);

              return;
            }
            if ("inviteUrl" in result && result.inviteUrl) {
              setInviteUrl(result.inviteUrl);
              setMessage(
                result.emailSent
                  ? "Invite emailed. The link is below if you also want to share it."
                  : (result.emailError ?? "Copy the invite link below."),
              );
            }
            form.reset();
          }}
        >
          <input
            required
            className="min-w-48 flex-1 rounded-lg border border-separator px-3 py-2 text-sm"
            name="email"
            placeholder="teammate@company.com"
            type="email"
          />
          <select
            className="rounded-lg border border-separator bg-background px-3 py-2 text-sm"
            defaultValue="MEMBER"
            name="role"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
            <option value="GUEST">Guest</option>
          </select>
          <Button type="submit">Invite</Button>
        </form>
      ) : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {inviteUrl ? (
        <input
          readOnly
          aria-label="Workspace invite link"
          className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-xs"
          value={inviteUrl}
        />
      ) : null}
      <ul className="divide-y divide-separator rounded-xl border border-separator text-sm">
        {members.map((member) => {
          const locked = member.role === "OWNER" && actorRole !== "OWNER";

          return (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-2 px-4 py-3"
            >
              <span className="min-w-40 flex-1">
                {member.user.name ?? member.user.email}
                <span className="block text-xs text-muted">
                  {member.user.email}
                </span>
              </span>
              {canAdmin && !locked ? (
                <form
                  action={async (formData) => {
                    const result = await updateWorkspaceMemberRoleAction(
                      workspaceSlug,
                      member.id,
                      formData,
                    );

                    setMessage(
                      "error" in result && result.error ? result.error : null,
                    );
                  }}
                  className="flex items-center gap-2"
                >
                  <select
                    className="rounded border border-separator bg-background px-2 py-1"
                    defaultValue={member.role}
                    name="role"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" type="submit" variant="ghost">
                    Save role
                  </Button>
                </form>
              ) : (
                <span className="text-xs text-muted">
                  {ROLE_LABELS[member.role]}
                </span>
              )}
              {canAdmin && !locked ? (
                <form
                  action={async () => {
                    const result = await removeWorkspaceMemberAction(
                      workspaceSlug,
                      member.id,
                    );

                    setMessage(
                      "error" in result && result.error ? result.error : null,
                    );
                  }}
                >
                  <Button size="sm" type="submit" variant="danger">
                    Remove
                  </Button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
      {canAdmin && invites.length ? (
        <ul className="space-y-2 text-sm text-muted">
          {invites.map((invite) => (
            <li key={invite.id} className="flex items-center gap-2">
              <span className="flex-1">
                {invite.email} · {ROLE_LABELS[invite.role]} · pending
              </span>
              <form
                action={async () => {
                  const result = await revokeWorkspaceInviteAction(
                    workspaceSlug,
                    invite.id,
                  );

                  setMessage(
                    "error" in result && result.error ? result.error : null,
                  );
                }}
              >
                <Button size="sm" type="submit" variant="ghost">
                  Revoke
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
