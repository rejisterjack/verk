"use client";

import type { Key } from "@heroui/react";
import type { DraftFields } from "@/lib/drafts";

import {
  Button,
  DateField,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
  useOverlayState,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LabelChecklist } from "@/components/label-checklist";
import { SimilarIssuesHint } from "@/components/similar-issues-hint";
import { SelectField } from "@/components/ui/select-field";
import { deleteDraftAction, saveDraftAction } from "@/lib/actions/drafts";
import { createIssueAction } from "@/lib/actions/issues";
import { estimateOptions, normalizeScale } from "@/lib/estimate-points";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { isOfflineEnabled } from "@/lib/offline/feature";
import { createIssueLocal } from "@/lib/offline/issue-repository";

type Opt = { id: string; name: string };
type Member = { id: string; name: string | null; email: string };
type LabelOpt = {
  id: string;
  name: string;
  color: string;
  group?: string | null;
};
type WorkflowOpt = { id: string; name: string };
type TemplateOpt = {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: string;
  estimate: string;
};

export function CreateIssueForm({
  teamId,
  teamSlug,
  members,
  cycles,
  projects = [],
  milestones = [],
  labels = [],
  workflows = [],
  templates = [],
  estimateScale,
  hideTrigger = false,
  triggerLabel = "New issue",
}: {
  /** The team's estimate scale. Defaults to Fibonacci. */
  estimateScale?: string;
  teamId: string;
  teamSlug: string;
  members: Member[];
  cycles: Opt[];
  projects?: Opt[];
  milestones?: Opt[];
  labels?: LabelOpt[];
  workflows?: WorkflowOpt[];
  templates?: TemplateOpt[];
  hideTrigger?: boolean;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const modal = useOverlayState();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [templateId, setTemplateId] = useState<Key | null>(null);
  const [typedTitle, setTypedTitle] = useState("");
  const [draft, setDraft] = useState<{
    id: string;
    fields: DraftFields;
  } | null>(null);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [labelSel, setLabelSel] = useState<Set<string>>(() => new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const template = templates.find(
    (item) => item.id === String(templateId ?? ""),
  );
  const prefill = draft?.fields;

  function validDate(value?: string) {
    if (!value) return null;
    try {
      return parseDate(value.slice(0, 10));
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const openHandler = () => {
      setDraft(null);
      setLabelSel(new Set());
      setTypedTitle("");
      setDraftNote(null);
      modal.open();
    };
    const resumeHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; fields: DraftFields }>)
        .detail;

      if (!detail) return;
      setDraft(detail);
      setLabelSel(new Set(detail.fields.labelIds ?? []));
      setTypedTitle(detail.fields.title ?? "");
      setTemplateId(null);
      setDraftNote(null);
      setError(null);
      modal.open();
    };

    window.addEventListener("verk:create-issue", openHandler);
    window.addEventListener("verk:resume-draft", resumeHandler);

    // Opened from an installed-app shortcut or "Share to Verk": `?new=1&title=…&description=…`.
    // Only the global instance reacts, so two forms on one page don't both open.
    if (hideTrigger) {
      const params = new URLSearchParams(window.location.search);

      if (params.get("new") === "1") {
        const fields: DraftFields = {};
        const title = params.get("title");
        const description = params.get("description");

        if (title) fields.title = title.slice(0, 300);
        if (description) fields.description = description.slice(0, 20_000);
        resumeHandler(
          new CustomEvent("verk:resume-draft", { detail: { id: "", fields } }),
        );
        for (const key of ["new", "title", "description"]) params.delete(key);
        const rest = params.toString();

        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${rest ? `?${rest}` : ""}`,
        );
      }
    }

    return () => {
      window.removeEventListener("verk:create-issue", openHandler);
      window.removeEventListener("verk:resume-draft", resumeHandler);
    };
  }, [modal, hideTrigger]);

  async function saveAsDraft() {
    if (!formRef.current) return;
    setError(null);
    setDraftNote(null);
    const formData = new FormData(formRef.current);

    if (
      isOfflineEnabled() &&
      typeof navigator !== "undefined" &&
      !navigator.onLine
    ) {
      // Offline: park the draft in the outbox; it is saved when the connection returns.
      const fields: Record<string, unknown> = {};

      for (const key of [
        "title",
        "description",
        "status",
        "workflowStatusId",
        "priority",
        "estimate",
        "dueDate",
        "assigneeId",
        "cycleId",
        "projectId",
        "milestoneId",
      ]) {
        const value = formData.get(key);

        if (value != null && String(value).length) fields[key] = String(value);
      }
      fields.labelIds = formData.getAll("labelIds").map(String).filter(Boolean);
      if (
        !String(fields.title ?? "").trim() &&
        !String(fields.description ?? "").trim()
      ) {
        setError("Add a title or description before saving a draft");

        return;
      }
      const { queueDraftLocal } =
        await import("@/lib/offline/issue-repository");

      await queueDraftLocal(teamId, fields, draft?.id);
      setDraftNote("Offline: the draft will be saved when you reconnect");

      return;
    }
    const result = await saveDraftAction(teamSlug, formData, draft?.id);

    if ("error" in result) {
      setError(result.error ?? "Could not save the draft");

      return;
    }
    setDraft({ id: result.id, fields: draft?.fields ?? {} });
    setDraftNote("Draft saved");
    router.refresh();
  }

  return (
    <Modal state={modal}>
      {hideTrigger ? null : (
        <Button size="sm" onPress={modal.open}>
          {triggerLabel}
        </Button>
      )}
      <Modal.Backdrop>
        <Modal.Container scroll="inside" size="lg">
          <Modal.Dialog>
            {({ close }) => (
              <>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading className="text-[15px] font-semibold">
                    New issue
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Form
                    key={draft?.id ?? "new"}
                    ref={formRef}
                    className="flex flex-col gap-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setPending(true);
                      setError(null);
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      const named = (name: string) => {
                        const fromData = formData.get(name);

                        if (fromData != null && String(fromData).length > 0) {
                          return String(fromData);
                        }

                        return "";
                      };

                      const goOffline =
                        isOfflineEnabled() &&
                        typeof navigator !== "undefined" &&
                        !navigator.onLine;

                      if (goOffline) {
                        const dueRaw = named("dueDate");
                        const local = await createIssueLocal(teamId, {
                          title:
                            named("title") ||
                            String(formData.get("title") ?? ""),
                          description: named("description"),
                          status: named("status") || "BACKLOG",
                          priority: named("priority") || "NONE",
                          estimate: named("estimate") || "NONE",
                          startDate: named("startDate") || null,
                          dueDate: dueRaw || null,
                          assigneeId: named("assigneeId") || null,
                          cycleId: named("cycleId") || null,
                          projectId: named("projectId") || null,
                          labelIds: formData
                            .getAll("labelIds")
                            .map(String)
                            .filter(Boolean),
                        });

                        close();
                        setPending(false);
                        const href =
                          local.number != null
                            ? `/t/${teamSlug}/issues/${local.number}`
                            : `/t/${teamSlug}/issues/tmp/${local.id}`;

                        router.push(href);
                        router.refresh();

                        return;
                      }

                      try {
                        const result = await createIssueAction(
                          teamSlug,
                          formData,
                        );

                        if (result?.error) {
                          setError(result.error);
                          setPending(false);

                          return;
                        }

                        // A published draft is spent: remove it.
                        if (draft?.id) {
                          await deleteDraftAction(teamSlug, draft.id);
                          setDraft(null);
                        }
                        close();
                        setPending(false);

                        if (result?.number != null) {
                          router.push(`/t/${teamSlug}/issues/${result.number}`);
                          router.refresh();
                        }
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Failed to create issue",
                        );
                        setPending(false);
                      }
                    }}
                  >
                    {templates.length > 0 ? (
                      <SelectField
                        clearable
                        label="Template"
                        options={[
                          ...templates.map((item) => ({
                            id: item.id,
                            label: item.name,
                          })),
                        ]}
                        placeholder="None"
                        value={templateId}
                        onChange={setTemplateId}
                      />
                    ) : null}
                    <TextField
                      key={`${String(templateId)}-title`}
                      isRequired
                      defaultValue={prefill?.title ?? template?.title ?? ""}
                      name="title"
                      onChange={setTypedTitle}
                    >
                      <Label className="sr-only">Title</Label>
                      <Input
                        // eslint-disable-next-line jsx-a11y/no-autofocus -- focus title when create modal opens
                        autoFocus
                        className="border-0 bg-transparent px-0 text-[17px] font-semibold shadow-none"
                        placeholder="Issue title"
                      />
                      <FieldError />
                    </TextField>
                    <SimilarIssuesHint
                      teamId={teamId}
                      teamSlug={teamSlug}
                      title={typedTitle}
                    />
                    <TextField
                      key={`${String(templateId)}-description`}
                      defaultValue={
                        prefill?.description ?? template?.description ?? ""
                      }
                      name="description"
                    >
                      <Label className="sr-only">Description</Label>
                      <TextArea
                        className="border-0 bg-transparent px-0 shadow-none"
                        placeholder="Add description…"
                        rows={4}
                      />
                    </TextField>
                    <div className="grid gap-2 border-t border-separator pt-3 sm:grid-cols-2">
                      <SelectField
                        isRequired
                        defaultValue={
                          prefill?.workflowStatusId ??
                          prefill?.status ??
                          workflows[0]?.id ??
                          "BACKLOG"
                        }
                        label="Status"
                        name={workflows.length ? "workflowStatusId" : "status"}
                        options={
                          workflows.length
                            ? workflows.map((workflow) => ({
                                id: workflow.id,
                                label: workflow.name,
                              }))
                            : Object.entries(STATUS_LABELS).map(
                                ([id, label]) => ({ id, label }),
                              )
                        }
                      />
                      <SelectField
                        key={`${String(templateId)}-priority`}
                        isRequired
                        defaultValue={
                          prefill?.priority ?? template?.priority ?? "NONE"
                        }
                        label="Priority"
                        name="priority"
                        options={Object.entries(PRIORITY_LABELS).map(
                          ([id, label]) => ({ id, label }),
                        )}
                      />
                      <SelectField
                        key={`${String(templateId)}-estimate`}
                        defaultValue={
                          prefill?.estimate ?? template?.estimate ?? "NONE"
                        }
                        label="Estimate"
                        name="estimate"
                        options={estimateOptions(
                          normalizeScale(estimateScale),
                          template?.estimate,
                        )}
                      />
                      <DateField name="startDate">
                        <Label>Start date</Label>
                        <DateField.Group>
                          <DateField.Input>
                            {(segment) => <DateField.Segment segment={segment} />}
                          </DateField.Input>
                        </DateField.Group>
                      </DateField>
                      <DateField
                        defaultValue={validDate(prefill?.dueDate)}
                        name="dueDate"
                      >
                        <Label>Due date</Label>
                        <DateField.Group>
                          <DateField.Input>
                            {(segment) => (
                              <DateField.Segment segment={segment} />
                            )}
                          </DateField.Input>
                        </DateField.Group>
                      </DateField>
                      <SelectField
                        clearable
                        defaultValue={prefill?.assigneeId}
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
                        defaultValue={prefill?.cycleId}
                        label="Cycle"
                        name="cycleId"
                        options={cycles.map((c) => ({
                          id: c.id,
                          label: c.name,
                        }))}
                        placeholder="No cycle"
                      />
                      <div className="sm:col-span-2">
                        <SelectField
                          clearable
                          defaultValue={prefill?.projectId}
                          label="Project"
                          name="projectId"
                          options={projects.map((p) => ({
                            id: p.id,
                            label: p.name,
                          }))}
                          placeholder="No project"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <SelectField
                          clearable
                          defaultValue={prefill?.milestoneId}
                          label="Milestone"
                          name="milestoneId"
                          options={milestones.map((m) => ({
                            id: m.id,
                            label: m.name,
                          }))}
                          placeholder="No milestone"
                        />
                      </div>
                    </div>
                    {labels.length ? (
                      <LabelChecklist
                        labels={labels}
                        name="labelIds"
                        selected={labelSel}
                        onToggle={(id, checked) =>
                          setLabelSel((prev) => {
                            const next = new Set(prev);

                            if (checked) next.add(id);
                            else next.delete(id);

                            return next;
                          })
                        }
                      />
                    ) : null}
                    {error ? (
                      <p className="text-danger text-sm">{error}</p>
                    ) : null}
                    {draftNote ? (
                      <p className="text-[12px] text-muted">{draftNote}</p>
                    ) : null}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button slot="close" variant="tertiary">
                        Cancel
                      </Button>
                      <Button
                        isDisabled={pending}
                        type="button"
                        variant="secondary"
                        onPress={() => void saveAsDraft()}
                      >
                        Save draft
                      </Button>
                      <Button isDisabled={pending} type="submit">
                        {pending ? "Creating…" : "Create"}
                      </Button>
                    </div>
                  </Form>
                </Modal.Body>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
