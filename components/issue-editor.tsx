"use client";

import type { LocalIssue } from "@/lib/offline/db";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { IssueAttachments } from "@/components/issue-attachments";
import { IssueComments } from "@/components/issue-comments";
import { IssueRelations } from "@/components/issue-relations";
import { PageHeader } from "@/components/page-header";
import { ConflictModal } from "@/components/pwa/conflict-modal";
import { deleteIssueAction, updateIssueAction } from "@/lib/actions/issues";
import { ESTIMATE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { isOfflineEnabled } from "@/lib/offline/feature";
import {
  deleteIssueLocal,
  getLocalIssue,
  hydrateIssuesFromServer,
  subscribeIssues,
  updateIssueLocal,
  type ServerIssue,
} from "@/lib/offline/issue-repository";
import { issueKey } from "@/lib/utils";

type Member = { id: string; name: string | null; email: string };
type Opt = { id: string; name: string };
type LabelOpt = { id: string; name: string; color: string };

export function IssueEditor({
  teamId,
  teamSlug,
  issueNumber,
  tmpId,
  initialIssue,
  members,
  cycles,
  projects = [],
  labels = [],
  initialLabelIds = [],
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
    estimate?: string;
    dueDate?: string | null;
    assigneeId: string | null;
    cycleId: string | null;
    projectId?: string | null;
    revision: number;
  };
  members: Member[];
  cycles: Opt[];
  projects?: Opt[];
  labels?: LabelOpt[];
  initialLabelIds?: string[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [issue, setIssue] = useState(initialIssue);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(
    () => new Set(initialLabelIds),
  );
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
            estimate: local.estimate ?? initialIssue.estimate,
            dueDate: local.dueDate ?? initialIssue.dueDate,
            projectId: local.projectId ?? initialIssue.projectId,
          });
          if (local.labelIds?.length) {
            setSelectedLabels(new Set(local.labelIds));
          }
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
    formData.set("labelsTouched", "1");
    formData.delete("labelIds");
    for (const id of selectedLabels) formData.append("labelIds", id);

    const dueRaw = String(formData.get("dueDate") || "");
    const patch = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      status: String(formData.get("status") ?? ""),
      priority: String(formData.get("priority") ?? ""),
      estimate: String(formData.get("estimate") ?? "NONE"),
      dueDate: dueRaw || null,
      assigneeId: formData.get("assigneeId")
        ? String(formData.get("assigneeId"))
        : null,
      cycleId: formData.get("cycleId") ? String(formData.get("cycleId")) : null,
      projectId: formData.get("projectId")
        ? String(formData.get("projectId"))
        : null,
    };

    const goOffline =
      isOfflineEnabled() &&
      typeof navigator !== "undefined" &&
      !navigator.onLine;

    if (goOffline) {
      await updateIssueLocal(teamId, issue.id, patch);
      const { setLabelsLocal } = await import("@/lib/offline/issue-repository");

      await setLabelsLocal(teamId, issue.id, [...selectedLabels]);
      setIssue((prev) => ({
        ...prev,
        ...patch,
        dueDate: patch.dueDate,
      }));
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
    router.refresh();
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

  const dueValue = issue.dueDate
    ? issue.dueDate.slice(0, 10)
    : "";

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
        <input name="labelsTouched" type="hidden" value="1" />
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
            <span className="text-muted">Estimate</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.estimate ?? "NONE"}
              name="estimate"
            >
              {Object.entries(ESTIMATE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Due date</span>
            <input
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={dueValue}
              name="dueDate"
              type="date"
            />
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
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted">Project</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.projectId ?? ""}
              name="projectId"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {labels.length ? (
          <fieldset className="text-sm">
            <legend className="mb-1 text-muted">Labels</legend>
            <div className="flex flex-wrap gap-2">
              {labels.map((l) => (
                <label
                  key={l.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-separator px-2 py-1"
                >
                  <input
                    checked={selectedLabels.has(l.id)}
                    type="checkbox"
                    onChange={(e) => {
                      setSelectedLabels((prev) => {
                        const next = new Set(prev);

                        if (e.target.checked) next.add(l.id);
                        else next.delete(l.id);

                        return next;
                      });
                    }}
                  />
                  <span
                    className="size-2 rounded-full"
                    style={{ background: l.color }}
                  />
                  {l.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <Button isDisabled={pending} type="submit">
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      <IssueRelations issueId={issue.id} teamId={teamId} teamSlug={teamSlug} />
      <IssueAttachments issueId={issue.id} teamId={teamId} />
      <IssueComments issueId={issue.id} teamId={teamId} />

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
