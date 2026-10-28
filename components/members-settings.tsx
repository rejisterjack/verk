"use client";

import { Button } from "@heroui/react";
import { useState } from "react";

import {
  inviteMemberAction,
  removeMemberAction,
  revokeInviteAction,
  updateMemberRoleAction,
} from "@/lib/actions/members";
import { ROLE_LABELS } from "@/lib/labels";

type Member = {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
};

type Invite = {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
  expiresAt: Date | string;
};

export function MembersSettings({
  teamSlug,
  members,
  invites,
  canAdmin,
}: {
  teamSlug: string;
  members: Member[];
  invites: Invite[];
  canAdmin: boolean;
}) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {canAdmin ? (
        <form
          className="flex flex-wrap gap-2 rounded-xl border border-separator p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setMessage(null);
            setInviteUrl(null);
            const formData = new FormData(e.currentTarget);
            const result = await inviteMemberAction(teamSlug, formData);

            if (result.error) {
              setMessage(result.error);

              return;
            }
            setInviteUrl(result.inviteUrl ?? null);
            setMessage(
              result.emailSent
                ? "Invite emailed and link ready to copy."
                : `Invite created. ${result.emailError ?? "Email not sent — copy the link."}`,
            );
            e.currentTarget.reset();
          }}
        >
          <input
            required
            className="min-w-56 flex-1 rounded-lg border border-separator bg-background px-3 py-2 text-sm"
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
          </select>
          <Button type="submit">Invite</Button>
          {message ? (
            <p className="w-full text-sm text-muted">{message}</p>
          ) : null}
          {inviteUrl ? (
            <div className="w-full flex gap-2 items-center">
              <input
                readOnly
                className="flex-1 rounded-lg border border-separator bg-background px-3 py-2 text-xs"
                value={inviteUrl}
              />
              <Button
                size="sm"
                variant="secondary"
                onPress={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                }}
              >
                Copy link
              </Button>
            </div>
          ) : null}
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-separator">
        <table className="w-full text-sm">
          <thead className="border-b border-separator bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                className="border-b border-separator last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{m.user.name ?? "Unnamed"}</div>
                  <div className="text-muted text-xs">{m.user.email}</div>
                </td>
                <td className="px-4 py-3">
                  {canAdmin ? (
                    <form
                      onChange={async (e) => {
                        const form = e.currentTarget;
                        const formData = new FormData(form);

                        await updateMemberRoleAction(teamSlug, m.id, formData);
                      }}
                    >
                      <select
                        className="rounded-lg border border-separator bg-background px-2 py-1"
                        defaultValue={m.role}
                        name="role"
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </form>
                  ) : (
                    ROLE_LABELS[m.role]
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {canAdmin && m.role !== "OWNER" ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onPress={async () => {
                        await removeMemberAction(teamSlug, m.id);
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invites.length > 0 ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Pending invites</h3>
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between rounded-lg border border-separator px-3 py-2 text-sm"
              >
                <span>
                  {invite.email} · {ROLE_LABELS[invite.role]}
                </span>
                {canAdmin ? (
                  <Button
                    size="sm"
                    variant="tertiary"
                    onPress={async () => {
                      await revokeInviteAction(teamSlug, invite.id);
                    }}
                  >
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
