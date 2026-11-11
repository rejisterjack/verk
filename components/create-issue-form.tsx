"use client";

import type { Key } from "@heroui/react";

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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LabelChecklist } from "@/components/label-checklist";
import { SelectField } from "@/components/ui/select-field";
import { createIssueAction } from "@/lib/actions/issues";
import { ESTIMATE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
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
}: {
  teamId: string;
  teamSlug: string;
  members: Member[];
  cycles: Opt[];
  projects?: Opt[];
  milestones?: Opt[];
  labels?: LabelOpt[];
  workflows?: WorkflowOpt[];
  templates?: TemplateOpt[];
}) {
  const router = useRouter();
  const modal = useOverlayState();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [templateId, setTemplateId] = useState<Key | null>(null);
  const template = templates.find(
    (item) => item.id === String(templateId ?? ""),
  );

  useEffect(() => {
    const openHandler = () => modal.open();

    window.addEventListener("verk:create-issue", openHandler);

    return () => window.removeEventListener("verk:create-issue", openHandler);
  }, [modal]);

  return (
    <Modal state={modal}>
      <Button onPress={modal.open}>New issue</Button>
      <Modal.Backdrop>
        <Modal.Container scroll="inside" size="lg">
          <Modal.Dialog>
            {({ close }) => (
              <>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Create issue</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Form
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

                      const result = await createIssueAction(
                        teamSlug,
                        formData,
                      );

                      if (result?.error) {
                        setError(result.error);
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
                      defaultValue={template?.title ?? ""}
                      name="title"
                    >
                      <Label>Title</Label>
                      <Input placeholder="Ship MCP docs" />
                      <FieldError />
                    </TextField>
                    <TextField
                      key={`${String(templateId)}-description`}
                      name="description"
                    >
                      <Label>Description</Label>
                      <TextArea
                        defaultValue={template?.description ?? ""}
                        placeholder="Optional details…"
                        rows={3}
                      />
                    </TextField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField
                        isRequired
                        defaultValue={workflows[0]?.id ?? "BACKLOG"}
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
                        defaultValue={template?.priority ?? "NONE"}
                        label="Priority"
                        name="priority"
                        options={Object.entries(PRIORITY_LABELS).map(
                          ([id, label]) => ({ id, label }),
                        )}
                      />
                      <SelectField
                        key={`${String(templateId)}-estimate`}
                        defaultValue={template?.estimate ?? "NONE"}
                        label="Estimate"
                        name="estimate"
                        options={Object.entries(ESTIMATE_LABELS).map(
                          ([id, label]) => ({ id, label }),
                        )}
                      />
                      <DateField defaultValue={null} name="dueDate">
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
                      <LabelChecklist labels={labels} name="labelIds" />
                    ) : null}
                    {error ? (
                      <p className="text-danger text-sm">{error}</p>
                    ) : null}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button slot="close" variant="tertiary">
                        Cancel
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
