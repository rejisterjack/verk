"use client";

import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createIssueAction } from "@/lib/actions/issues";
import { isOfflineEnabled } from "@/lib/offline/feature";
import { createIssueLocal } from "@/lib/offline/issue-repository";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";

export function CreateIssueForm({
  teamId,
  teamSlug,
  members,
  cycles,
}: {
  teamId: string;
  teamSlug: string;
  members: Array<{ id: string; name: string | null; email: string }>;
  cycles: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) {
    return <Button onPress={() => setOpen(true)}>New issue</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-separator bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create issue</h2>
          <Button size="sm" variant="ghost" onPress={() => setOpen(false)}>
            Close
          </Button>
        </div>
        <Form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError(null);
            const formData = new FormData(e.currentTarget);

            if (isOfflineEnabled()) {
              const local = await createIssueLocal(teamId, {
                title: String(formData.get("title") ?? ""),
                description: String(formData.get("description") ?? ""),
                status: String(formData.get("status") ?? "BACKLOG"),
                priority: String(formData.get("priority") ?? "NONE"),
                assigneeId: formData.get("assigneeId")
                  ? String(formData.get("assigneeId"))
                  : null,
                cycleId: formData.get("cycleId")
                  ? String(formData.get("cycleId"))
                  : null,
              });

              setOpen(false);
              setPending(false);
              if (local.number != null) {
                router.push(`/t/${teamSlug}/issues/${local.number}`);
              } else {
                router.push(`/t/${teamSlug}/issues/tmp/${local.id}`);
              }
              router.refresh();

              return;
            }

            const result = await createIssueAction(teamSlug, formData);

            if (result?.error) {
              setError(result.error);
              setPending(false);
            }
          }}
        >
          <TextField isRequired name="title">
            <Label>Title</Label>
            <Input placeholder="Ship MCP docs" />
            <FieldError />
          </TextField>
          <TextField name="description">
            <Label>Description</Label>
            <TextArea placeholder="Optional details…" rows={4} />
          </TextField>
          <label className="flex flex-col gap-1 text-sm">
            <span>Status</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue="BACKLOG"
              name="status"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Priority</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue="NONE"
              name="priority"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Assignee</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue=""
              name="assigneeId"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name ?? m.email}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Cycle</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue=""
              name="cycleId"
            >
              <option value="">No cycle</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="text-danger text-sm">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tertiary" onPress={() => setOpen(false)}>
              Cancel
            </Button>
            <Button isDisabled={pending} type="submit">
              {pending ? "Creating…" : "Create"}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
