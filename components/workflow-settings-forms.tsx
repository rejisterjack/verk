"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { WORKFLOW_STATUS_TYPE_OPTIONS } from "@/components/form-options";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton as Button } from "@/components/submit-button";

export function AddWorkflowStatusForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form action={action} className="mb-6 flex flex-wrap items-end gap-2">
      <TextField isRequired name="name">
        <Label className="sr-only">Name</Label>
        <Input placeholder="Name" />
      </TextField>
      <TextField isRequired name="key">
        <Label className="sr-only">Key</Label>
        <Input pattern="[a-z0-9_]+" placeholder="key" />
      </TextField>
      <SelectField
        defaultValue="unstarted"
        label="Type"
        name="type"
        options={WORKFLOW_STATUS_TYPE_OPTIONS}
      />
      <Button size="sm" type="submit">
        Add status
      </Button>
    </Form>
  );
}

type StatusRow = {
  id: string;
  key: string;
  type: string;
  name: string;
};

export function WorkflowStatusRow({
  status,
  index,
  total,
  renameAction,
  moveUpAction,
  moveDownAction,
}: {
  status: StatusRow;
  index: number;
  total: number;
  renameAction: (formData: FormData) => void | Promise<void>;
  moveUpAction: (formData: FormData) => void | Promise<void>;
  moveDownAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <li className="rounded-xl border border-separator p-3 text-sm">
      <Form action={renameAction} className="flex flex-wrap items-end gap-2">
        <input name="id" type="hidden" value={status.id} />
        <TextField
          className="flex-1"
          defaultValue={status.name}
          name="name"
        >
          <Label>
            {status.key} · {status.type}
          </Label>
          <Input />
        </TextField>
        <Button size="sm" type="submit">
          Rename
        </Button>
      </Form>
      <div className="mt-2 flex gap-2">
        <Form action={moveUpAction}>
          <input name="id" type="hidden" value={status.id} />
          <input name="direction" type="hidden" value="up" />
          <Button
            isDisabled={index === 0}
            size="sm"
            type="submit"
            variant="ghost"
          >
            Up
          </Button>
        </Form>
        <Form action={moveDownAction}>
          <input name="id" type="hidden" value={status.id} />
          <input name="direction" type="hidden" value="down" />
          <Button
            isDisabled={index === total - 1}
            size="sm"
            type="submit"
            variant="ghost"
          >
            Down
          </Button>
        </Form>
      </div>
    </li>
  );
}
