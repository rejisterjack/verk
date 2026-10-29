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
import { useEffect, useState } from "react";

import { createIssueAction } from "@/lib/actions/issues";
import { ESTIMATE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { isOfflineEnabled } from "@/lib/offline/feature";
import { createIssueLocal } from "@/lib/offline/issue-repository";

type Opt = { id: string; name: string };
type Member = { id: string; name: string | null; email: string };
type LabelOpt = { id: string; name: string; color: string };
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
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const template = templates.find((item) => item.id === templateId);

  useEffect(() => {
    const openHandler = () => setOpen(true);

    window.addEventListener("verk:create-issue", openHandler);

    return () => window.removeEventListener("verk:create-issue", openHandler);
  }, []);

  if (!open) {
    return <Button onPress={() => setOpen(true)}>New issue</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-separator bg-background p-6 shadow-xl">
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
            const form = e.currentTarget;
            const formData = new FormData(form);
            const named = (name: string) => {
              const fromData = formData.get(name);
              if (fromData != null && String(fromData).length > 0) {
                return String(fromData);
              }
              const el = form.elements.namedItem(name);

              if (el && el instanceof HTMLSelectElement) return el.value;
              if (el && el instanceof HTMLInputElement) return el.value;

              return "";
            };

            const goOffline =
              isOfflineEnabled() &&
              typeof navigator !== "undefined" &&
              !navigator.onLine;

            if (goOffline) {
              const dueRaw = named("dueDate");
              const local = await createIssueLocal(teamId, {
                title: named("title") || String(formData.get("title") ?? ""),
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

              setOpen(false);
              setPending(false);
              const href =
                local.number != null
                  ? `/t/${teamSlug}/issues/${local.number}`
                  : `/t/${teamSlug}/issues/tmp/${local.id}`;

              router.push(href);
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
          {templates.length > 0 ? (
            <label className="flex flex-col gap-1 text-sm">
              <span>Template</span>
              <select
                className="rounded-lg border border-separator bg-background px-3 py-2"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">None</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <TextField key={`${templateId}-title`} isRequired name="title">
            <Label>Title</Label>
            <Input defaultValue={template?.title ?? ""} placeholder="Ship MCP docs" />
            <FieldError />
          </TextField>
          <TextField key={`${templateId}-description`} name="description">
            <Label>Description</Label>
            <TextArea
              defaultValue={template?.description ?? ""}
              placeholder="Optional details…"
              rows={3}
            />
          </TextField>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span>Status</span>
              <select
                className="rounded-lg border border-separator bg-background px-3 py-2"
                defaultValue={workflows[0]?.id ?? "BACKLOG"}
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
              <span>Priority</span>
              <select
                key={`${templateId}-priority`}
                className="rounded-lg border border-separator bg-background px-3 py-2"
                defaultValue={template?.priority ?? "NONE"}
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
              <span>Estimate</span>
              <select
                key={`${templateId}-estimate`}
                className="rounded-lg border border-separator bg-background px-3 py-2"
                defaultValue={template?.estimate ?? "NONE"}
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
              <span>Due date</span>
              <input
                className="rounded-lg border border-separator bg-background px-3 py-2"
                name="dueDate"
                type="date"
              />
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
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span>Project</span>
              <select
                className="rounded-lg border border-separator bg-background px-3 py-2"
                defaultValue=""
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
              <span>Milestone</span>
              <select
                className="rounded-lg border border-separator bg-background px-3 py-2"
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
              <legend className="mb-1">Labels</legend>
              <div className="flex flex-wrap gap-2">
                {labels.map((l) => (
                  <label
                    key={l.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-separator px-2 py-1"
                  >
                    <input name="labelIds" type="checkbox" value={l.id} />
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
