"use client";

import type { LocalIssue } from "@/lib/offline/db";

import { parseDate } from "@internationalized/date";
import {
  Button,
  DateField,
  Form,
  Input,
  Label,
  Switch,
  TextField,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { IssueActivityList } from "@/components/issue-activity";
import { LabelChecklist } from "@/components/label-checklist";
import { IssueAttachments } from "@/components/issue-attachments";
import { IssueLinks } from "@/components/issue-links";
import { MarkdownField } from "@/components/markdown-field";
import { MarkdownBody } from "@/components/markdown-body";
import { IssueComments } from "@/components/issue-comments";
import { IssueRelations } from "@/components/issue-relations";
import { PageHeader } from "@/components/page-header";
import { ConflictModal } from "@/components/pwa/conflict-modal";
import { SelectField } from "@/components/ui/select-field";
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
import { slaBreached, type SlaWindow } from "@/lib/sla";
import { issueKey } from "@/lib/utils";

type Member = { id: string; name: string | null; email: string };
type Opt = { id: string; name: string };
type LabelOpt = {
  id: string;
  name: string;
  color: string;
  group?: string | null;
};
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
  currentUserId,
  slaHours,
  slaWindow,
  createdAt,
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
  currentUserId?: string;
  slaHours?: unknown;
  slaWindow?: SlaWindow;
  createdAt?: string | null;
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

  const dueValue = issue.dueDate ? issue.dueDate.slice(0, 10) : "";

  return (
    <div className="max-w-3xl">
      <PageHeader
        description={`${issueKey(teamSlug, issue.number)}${
          createdAt &&
          slaBreached(
            issue.priority,
            issue.status,
            new Date(createdAt),
            slaHours,
            new Date(),
            slaWindow,
          )
            ? " · SLA"
            : ""
        }`}
        title={issue.title}
      />

      <Form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave(new FormData(e.currentTarget));
        }}
      >
        <input name="labelsTouched" type="hidden" value="1" />
        <input name="revision" type="hidden" value={issue.revision} />
        <TextField
          key={issue.title + issue.revision}
          isRequired
          defaultValue={issue.title}
          name="title"
        >
          <Label>Title</Label>
          <Input />
        </TextField>
        <div className="flex flex-col gap-1">
          <MarkdownField defaultValue={issue.description} name="description" />
          <MarkdownBody text={issue.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            key={"s" + (issue.workflowStatusId ?? issue.status)}
            isRequired
            defaultValue={issue.workflowStatusId ?? issue.status}
            label="Status"
            name={workflows.length ? "workflowStatusId" : "status"}
            options={
              workflows.length
                ? workflows.map((workflow) => ({
                    id: workflow.id,
                    label: workflow.name,
                  }))
                : Object.entries(STATUS_LABELS).map(([id, label]) => ({
                    id,
                    label,
                  }))
            }
          />
          <SelectField
            key={"p" + issue.priority}
            isRequired
            defaultValue={issue.priority}
            label="Priority"
            name="priority"
            options={Object.entries(PRIORITY_LABELS).map(([id, label]) => ({
              id,
              label,
            }))}
          />
          <SelectField
            defaultValue={issue.estimate ?? "NONE"}
            label="Estimate"
            name="estimate"
            options={Object.entries(ESTIMATE_LABELS).map(([id, label]) => ({
              id,
              label,
            }))}
          />
          <DateField
            defaultValue={dueValue ? parseDate(dueValue) : null}
            name="dueDate"
          >
            <Label>Due date</Label>
            <DateField.Group>
              <DateField.Input>
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
            </DateField.Group>
          </DateField>
          <SelectField
            clearable
            defaultValue={issue.assigneeId ?? undefined}
            label="Assignee"
            name="assigneeId"
            options={members.map((m) => ({
              id: m.id,
              label: m.name ?? m.email,
            }))}
            placeholder="Unassigned"
          />
          <SelectField
            clearable
            defaultValue={issue.cycleId ?? undefined}
            label="Cycle"
            name="cycleId"
            options={cycles.map((c) => ({ id: c.id, label: c.name }))}
            placeholder="No cycle"
          />
          <div className="sm:col-span-2">
            <SelectField
              clearable
              defaultValue={issue.projectId ?? undefined}
              label="Project"
              name="projectId"
              options={projects.map((p) => ({ id: p.id, label: p.name }))}
              placeholder="No project"
            />
          </div>
          <div className="sm:col-span-2">
            <SelectField
              clearable
              defaultValue={issue.milestoneId ?? undefined}
              label="Milestone"
              name="milestoneId"
              options={milestones.map((m) => ({ id: m.id, label: m.name }))}
              placeholder="No milestone"
            />
          </div>
        </div>
        {labels.length ? (
          <LabelChecklist
            labels={labels}
            selected={selectedLabels}
            onToggle={(id, checked) => {
              setSelectedLabels((prev) => {
                const next = new Set(prev);

                if (checked) next.add(id);
                else next.delete(id);

                return next;
              });
            }}
          />
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <Button isDisabled={pending} type="submit">
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Form>

      <IssueRelations issueId={issue.id} teamId={teamId} teamSlug={teamSlug} />
      <IssueLinks issueId={issue.id} teamId={teamId} />
      <IssueActivityList issueId={issue.id} teamId={teamId} />
      <IssueAttachments issueId={issue.id} teamId={teamId} />
      <IssueComments
        currentUserId={currentUserId}
        issueId={issue.id}
        teamId={teamId}
      />

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
    <Switch
      className="mt-6"
      isSelected={on}
      onChange={(selected) => {
        void fetch(`/api/teams/${teamId}/issues/${issueId}/subscription`, {
          method: selected ? "POST" : "DELETE",
          credentials: "same-origin",
        }).then(() => setOn(selected));
      }}
    >
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Content>
        <Label>{on ? "Subscribed" : "Subscribe"}</Label>
      </Switch.Content>
    </Switch>
  );
}
