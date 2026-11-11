"use client";

import { Button, Form, Input, Label, TextField } from "@heroui/react";
import { useState } from "react";

import { SelectField } from "@/components/ui/select-field";
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
        <Form
          className="flex flex-wrap items-end gap-2 rounded-xl border border-separator p-4"
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
                ? "Invite emailed. Link below if you want to share it too."
                : `Invite created. ${result.emailError ?? "Email not sent — copy the magic link below."}`,
            );
            e.currentTarget.reset();
          }}
        >
          <TextField
            isRequired
            className="min-w-56 flex-1"
            name="email"
            type="email"
          >
            <Label>Email</Label>
            <Input placeholder="teammate@company.com" />
          </TextField>
          <SelectField
            defaultValue="MEMBER"
            label="Role"
            name="role"
            options={[
              { id: "MEMBER", label: "Member" },
              { id: "ADMIN", label: "Admin" },
            ]}
          />
          <Button type="submit">Invite</Button>
          {message ? (
            <p className="w-full text-sm text-muted">{message}</p>
          ) : null}
          {inviteUrl ? (
            <div className="w-full space-y-1 rounded-lg border border-separator bg-surface p-3">
              <p className="text-xs font-medium text-foreground">
                Magic invite link
              </p>
              <div className="flex gap-2 items-end">
                <TextField
                  isReadOnly
                  aria-label="Invite magic link"
                  className="flex-1"
                  value={inviteUrl}
                >
                  <Label>Invite link</Label>
                  <Input />
                </TextField>
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
            </div>
          ) : null}
        </Form>
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
                    <SelectField
                      defaultValue={m.role}
                      label="Role"
                      name="role"
                      options={Object.entries(ROLE_LABELS).map(
                        ([id, label]) => ({ id, label }),
                      )}
                      onChange={async (key) => {
                        if (key == null) return;
                        const formData = new FormData();

                        formData.set("role", String(key));
                        await updateMemberRoleAction(teamSlug, m.id, formData);
                      }}
                    />
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
