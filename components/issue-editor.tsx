"use client";

import type { LocalIssue } from "@/lib/offline/db";
import type { IssueStatus } from "@/lib/generated/prisma/client";

import { parseDate } from "@internationalized/date";
import {
  Button,
  Calendar,
  DateField,
  DatePicker,
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
import { IssueComments } from "@/components/issue-comments";
import { IssueRelations } from "@/components/issue-relations";
import { ViewToolbar } from "@/components/page-header";
import { ConflictModal } from "@/components/pwa/conflict-modal";
import { SelectField } from "@/components/ui/select-field";
import { deleteIssueAction, updateIssueAction } from "@/lib/actions/issues";
import {
  ESTIMATE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  statusToWorkflowKey,
} from "@/lib/labels";
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
type WorkflowOpt = { id: string; name: string; key?: string };

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
  readOnly = false,
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
  readOnly?: boolean;
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
    if (readOnly || pending) return;
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
  const statusDefault = (() => {
    if (!workflows.length) return issue.status;
    if (
      issue.workflowStatusId &&
      workflows.some((w) => w.id === issue.workflowStatusId)
    ) {
      return issue.workflowStatusId;
    }
    const key = statusToWorkflowKey(issue.status as IssueStatus);

    return (
      workflows.find((w) => w.key === key)?.id ??
      workflows[0]?.id ??
      issue.status
    );
  })();

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <div className="flex items-center gap-2">
            {readOnly ? (
              <span className="text-[12px] text-muted">View only</span>
            ) : (
              <span className="text-[12px] text-muted">
                {pending ? "Saving…" : error ? "Error" : "Saved"}
              </span>
            )}
            {canDelete && !readOnly ? (
              <Button
                size="sm"
                type="button"
                variant="danger"
                onPress={onDelete}
              >
                Delete
              </Button>
            ) : null}
          </div>
        }
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

      <form
        className="grid flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_16rem]"
        onBlur={(e) => {
          if (readOnly) return;
          const related = e.relatedTarget as Node | null;

          if (related && e.currentTarget.contains(related)) return;
          void onSave(new FormData(e.currentTarget));
        }}
        onChange={(e) => {
          if (readOnly) return;
          const target = e.target as HTMLElement;

          if (
            target.tagName === "SELECT" ||
            target.getAttribute("role") === "combobox" ||
            target.getAttribute("type") === "checkbox"
          ) {
            void onSave(new FormData(e.currentTarget));
          }
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (readOnly) return;
          await onSave(new FormData(e.currentTarget));
        }}
      >
        <input name="labelsTouched" type="hidden" value="1" />
        <input name="revision" type="hidden" value={issue.revision} />
        <div className="flex flex-col gap-4 border-separator px-4 py-4 lg:border-r">
          <TextField
            key={issue.title + issue.revision}
            fullWidth
            isRequired
            defaultValue={issue.title}
            isReadOnly={readOnly}
            name="title"
          >
            <Label className="sr-only">Title</Label>
            <Input className="border-0 bg-transparent px-0 text-[17px] font-semibold shadow-none" />
          </TextField>
          <MarkdownField
            defaultValue={issue.description}
            name="description"
            readOnly={readOnly}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {!readOnly ? (
            <>
              <IssueRelations
                issueId={issue.id}
                teamId={teamId}
                teamSlug={teamSlug}
              />
              <IssueLinks issueId={issue.id} teamId={teamId} />
              <IssueAttachments issueId={issue.id} teamId={teamId} />
            </>
          ) : null}
          <IssueActivityList issueId={issue.id} teamId={teamId} />
          <IssueComments
            currentUserId={currentUserId}
            issueId={issue.id}
            teamId={teamId}
          />
        </div>

        <aside
          className={`flex flex-col gap-3 bg-surface/40 px-3 py-4 text-[13px] ${
            readOnly ? "pointer-events-none opacity-80" : ""
          }`}
        >
          <SelectField
            key={"s" + statusDefault}
            isRequired
            defaultValue={statusDefault}
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
          <DatePicker
            className="w-full"
            defaultValue={dueValue ? parseDate(dueValue) : null}
            isReadOnly={readOnly}
            name="dueDate"
          >
            <Label>Due date</Label>
            <DateField.Group>
              <DateField.Input>
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateField.Suffix>
                <DatePicker.Trigger>
                  <DatePicker.TriggerIndicator />
                </DatePicker.Trigger>
              </DateField.Suffix>
            </DateField.Group>
            <DatePicker.Popover>
              <Calendar aria-label="Choose due date">
                <Calendar.Header>
                  <Calendar.Heading />
                  <Calendar.NavButton slot="previous" />
                  <Calendar.NavButton slot="next" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>
                    {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>
                    {(date) => <Calendar.Cell date={date} />}
                  </Calendar.GridBody>
                </Calendar.Grid>
              </Calendar>
            </DatePicker.Popover>
          </DatePicker>
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
          <SelectField
            clearable
            defaultValue={issue.projectId ?? undefined}
            label="Project"
            name="projectId"
            options={projects.map((p) => ({ id: p.id, label: p.name }))}
            placeholder="No project"
          />
          <SelectField
            clearable
            defaultValue={issue.milestoneId ?? undefined}
            label="Milestone"
            name="milestoneId"
            options={milestones.map((m) => ({ id: m.id, label: m.name }))}
            placeholder="No milestone"
          />
          {labels.length ? (
            <LabelChecklist
              labels={labels}
              selected={selectedLabels}
              onToggle={(id, checked) => {
                if (readOnly) return;
                setSelectedLabels((prev) => {
                  const next = new Set(prev);

                  if (checked) next.add(id);
                  else next.delete(id);

                  return next;
                });
              }}
            />
          ) : null}
          {!readOnly ? (
            <SubscribeToggle issueId={issue.id} teamId={teamId} />
          ) : null}
        </aside>
      </form>

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
      className="mt-2"
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
