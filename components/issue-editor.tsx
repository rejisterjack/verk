"use client";

import type { LocalIssue } from "@/lib/offline/db";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { IssueActivityList } from "@/components/issue-activity";
import { IssueAttachments } from "@/components/issue-attachments";
import { IssueLinks } from "@/components/issue-links";
import { MarkdownField } from "@/components/markdown-field";
import { MarkdownBody } from "@/components/markdown-body";
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
type WorkflowOpt = { id: string; name: string };

export function IssueEditor({
  teamId,
  teamSlug,
  issueNumber,
  tmpId,
  initialIssue,
  members,
  cycles,
  projects = [],
  milestones = [],
  labels = [],
  workflows = [],
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
    milestoneId?: string | null;
    workflowStatusId?: string | null;
    revision: number;
  };
  members: Member[];
  cycles: Opt[];
  projects?: Opt[];
  milestones?: Opt[];
  labels?: LabelOpt[];
  workflows?: WorkflowOpt[];
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

    if (result && "conflict" in result && result.conflict) {
      const server = (result.issue ?? {}) as Partial<typeof issue>;

      setConflict({
        id: issue.id,
        teamId,
        number: issue.number,
        title: String(server.title ?? issue.title),
        description: String(server.description ?? issue.description),
        status: String(server.status ?? issue.status),
        priority: String(server.priority ?? issue.priority),
        estimate: issue.estimate ?? "NONE",
        dueDate: issue.dueDate ?? null,
        order: 0,
        assigneeId: issue.assigneeId,
        cycleId: issue.cycleId,
        projectId: issue.projectId ?? null,
        creatorId: "",
        revision: Number(server.revision ?? issue.revision),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        syncStatus: "conflict",
        conflictLocal: {
          title: patch.title,
          description: patch.description,
          status: patch.status,
          priority: patch.priority,
        },
      });
      if (typeof server.revision === "number") {
        setIssue((prev) => ({ ...prev, revision: server.revision as number }));
      }
    } else if (result?.error) setError(result.error);
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
        <input name="revision" type="hidden" value={issue.revision} />
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
          <MarkdownField defaultValue={issue.description} name="description" />
          <MarkdownBody text={issue.description} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Status</span>
            <select
              key={"s" + (issue.workflowStatusId ?? issue.status)}
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.workflowStatusId ?? issue.status}
              name={workflows.length ? "workflowStatusId" : "status"}
            >
              {workflows.length
                ? workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))
                : Object.entries(STATUS_LABELS).map(([value, label]) => (
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
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted">Milestone</span>
            <select
              className="rounded-lg border border-separator bg-background px-3 py-2"
              defaultValue={issue.milestoneId ?? ""}
              name="milestoneId"
            >
              <option value="">No milestone</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
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
      <IssueLinks issueId={issue.id} teamId={teamId} />
      <IssueActivityList issueId={issue.id} teamId={teamId} />
      <IssueAttachments issueId={issue.id} teamId={teamId} />
      <IssueComments issueId={issue.id} teamId={teamId} />

      {canDelete ? (
        <div className="mt-8 border-t border-separator pt-6">
          <Button type="button" variant="danger" onPress={onDelete}>
            Delete issue
          </Button>
        </div>
      ) : null}

      <SubscribeToggle issueId={issue.id} teamId={teamId} />

      {conflict ? (
        <ConflictModal
          issue={conflict}
          teamId={teamId}
          onClose={() => setConflict(null)}
          onKeepMine={
            conflict.creatorId === ""
              ? async () => {
                  const local = conflict.conflictLocal;
                  const fd = new FormData();

                  fd.set("title", String(local?.title ?? conflict.title));
                  fd.set(
                    "description",
                    String(local?.description ?? conflict.description),
                  );
                  fd.set("status", String(local?.status ?? conflict.status));
                  fd.set(
                    "priority",
                    String(local?.priority ?? conflict.priority),
                  );
                  fd.set("revision", String(conflict.revision));
                  if (issue.number != null) {
                    await updateIssueAction(teamSlug, issue.number, fd);
                  }
                  router.refresh();
                }
              : undefined
          }
          onKeepServer={
            conflict.creatorId === ""
              ? async () => {
                  setIssue((prev) => ({
                    ...prev,
                    title: conflict.title,
                    description: conflict.description,
                    status: conflict.status,
                    priority: conflict.priority,
                    revision: conflict.revision,
                  }));
                  router.refresh();
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function SubscribeToggle({
  teamId,
  issueId,
}: {
  teamId: string;
  issueId: string;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    void fetch(`/api/teams/${teamId}/issues/${issueId}/subscription`, {
      credentials: "same-origin",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOn(Boolean(data.subscribed));
      });
  }, [teamId, issueId]);

  return (
    <button
      className="mt-6 text-sm text-accent"
      type="button"
      onClick={() => {
        void fetch(`/api/teams/${teamId}/issues/${issueId}/subscription`, {
          method: on ? "DELETE" : "POST",
          credentials: "same-origin",
        }).then(() => setOn((v) => !v));
      }}
    >
      {on ? "Unsubscribe" : "Subscribe"}
    </button>
  );
}
