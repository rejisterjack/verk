"use client";

import type { LocalIssue } from "@/lib/offline/db";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConflictModal } from "@/components/pwa/conflict-modal";
import { deleteIssueAction, updateIssueAction } from "@/lib/actions/issues";
import { isOfflineEnabled } from "@/lib/offline/feature";
import {
  deleteIssueLocal,
  getLocalIssue,
  subscribeIssues,
  updateIssueLocal,
  type ServerIssue,
  hydrateIssuesFromServer,
} from "@/lib/offline/issue-repository";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { issueKey } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

type Member = { id: string; name: string | null; email: string };
type Cycle = { id: string; name: string };

export function IssueEditor({
  teamId,
  teamSlug,
  issueNumber,
  tmpId,
  initialIssue,
  members,
  cycles,
  canDelete,
}: {
  teamId: string;
  teamSlug: string;
  issueNumber?: number;
  tmpId?: string;
  initialIssue: {
    id: string;
    number: number | null;
    title: string;
    description: string;
    status: string;
    priority: string;
    assigneeId: string | null;
    cycleId: string | null;
    revision: number;
  };
  members: Member[];
  cycles: Cycle[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [issue, setIssue] = useState(initialIssue);
  const [conflict, setConflict] = useState<LocalIssue | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOfflineEnabled()) return;

    void hydrateIssuesFromServer(teamId, [
      {
        ...initialIssue,
        number: initialIssue.number ?? 0,
        order: 0,
        teamId,
      } as ServerIssue,
    ]);

    const refresh = () => {
      void getLocalIssue(teamId, tmpId ?? issueNumber ?? initialIssue.id).then(
        (local) => {
          if (!local) return;
          setIssue({
            id: local.id,
            number: local.number,
            title: local.title,
            description: local.description,
            status: local.status,
            priority: local.priority,
            assigneeId: local.assigneeId,
            cycleId: local.cycleId,
            revision: local.revision,
          });
          if (local.syncStatus === "conflict") setConflict(local);
        },
      );
    };

    const unsub = subscribeIssues(refresh);

    refresh();

    return unsub;
  }, [teamId, tmpId, issueNumber, initialIssue]);

  async function onSave(formData: FormData) {
    setPending(true);
    setError(null);
    const patch = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      status: String(formData.get("status") ?? ""),
      priority: String(formData.get("priority") ?? ""),
      assigneeId: formData.get("assigneeId")
        ? String(formData.get("assigneeId"))
        : null,
      cycleId: formData.get("cycleId") ? String(formData.get("cycleId")) : null,
    };

    if (isOfflineEnabled()) {
      await updateIssueLocal(teamId, issue.id, patch);
      setPending(false);
      router.refresh();

      return;
    }

    if (issue.number == null) {
      setError("Issue not synced yet");
      setPending(false);

      return;
    }

    const result = await updateIssueAction(teamSlug, issue.number, formData);

    if (result?.error) setError(result.error);
    setPending(false);
  }

  async function onDelete() {
    if (isOfflineEnabled()) {
      await deleteIssueLocal(teamId, issue.id);
      router.push(`/t/${teamSlug}/issues`);
      router.refresh();

      return;
    }
    if (issue.number != null) {
      await deleteIssueAction(teamSlug, issue.number);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        description={issueKey(teamSlug, issue.number)}
        title={issue.title}
      />

      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave(new FormData(e.currentTarget));
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Title</span>
          <input
            key={issue.title + issue.revision}
            required
            className="rounded-lg border border-separator bg-background px-3 py-2"
            defaultValue={issue.title}
            name="title"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Description</span>
          <textarea
            key={"d" + issue.description + issue.revision}
            className="min-h-40 rounded-lg border border-separator bg-background px-3 py-2"
            defaultValue={issue.description}
            name="description"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Status</span>
            <select
              key={"s" + issue.status}
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.status}
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
            <span className="text-muted">Priority</span>
            <select
              key={"p" + issue.priority}
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.priority}
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
            <span className="text-muted">Assignee</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.assigneeId ?? ""}
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
            <span className="text-muted">Cycle</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.cycleId ?? ""}
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
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <Button isDisabled={pending} type="submit">
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      {canDelete ? (
        <div className="mt-8 border-t border-separator pt-6">
          <Button type="button" variant="danger" onPress={onDelete}>
            Delete issue
          </Button>
        </div>
      ) : null}

      {conflict ? (
        <ConflictModal
          issue={conflict}
          teamId={teamId}
          onClose={() => setConflict(null)}
        />
      ) : null}
    </div>
  );
}
