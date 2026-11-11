"use client";

import { Checkbox, Form, Input, Label, TextField } from "@heroui/react";

import {
  VIEW_LAYOUT_OPTIONS,
  VIEW_PRIORITY_OPTIONS,
  VIEW_STATUS_OPTIONS,
} from "@/components/form-options";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton as Button } from "@/components/submit-button";

export function CreateViewForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form
      action={action}
      className="mb-6 space-y-2 rounded-xl border border-separator p-4"
    >
      <TextField isRequired name="name">
        <Label>View name</Label>
        <Input placeholder="View name" />
      </TextField>
      <SelectField
        clearable
        label="Status"
        name="status"
        options={VIEW_STATUS_OPTIONS.filter((o) => o.id !== "")}
        placeholder="Any status"
      />
      <SelectField
        clearable
        label="Priority"
        name="priority"
        options={VIEW_PRIORITY_OPTIONS.filter((o) => o.id !== "")}
        placeholder="Any priority"
      />
      <TextField name="cycleId">
        <Label>Cycle id (optional)</Label>
        <Input placeholder="Cycle id (optional)" />
      </TextField>
      <TextField name="assigneeId">
        <Label>Assignee id (optional)</Label>
        <Input placeholder="Assignee id (optional)" />
      </TextField>
      <TextField name="projectId">
        <Label>Project id (optional)</Label>
        <Input placeholder="Project id (optional)" />
      </TextField>
      <SelectField
        defaultValue="LIST"
        label="Layout"
        name="layout"
        options={VIEW_LAYOUT_OPTIONS}
      />
      <Button type="submit">Save view</Button>
    </Form>
  );
}

type ViewFilter = {
  status?: string;
  priority?: string;
  cycleId?: string;
  assigneeId?: string;
  projectId?: string;
};

type SavedView = {
  id: string;
  name: string;
  layout: string;
  pinned: boolean;
  filterJson: unknown;
};

export function UpdateViewForm({
  action,
  view,
}: {
  action: (formData: FormData) => void | Promise<void>;
  view: SavedView;
}) {
  const filters = (view.filterJson ?? {}) as ViewFilter;

  return (
    <Form action={action} className="flex flex-wrap items-end gap-2">
      <TextField className="flex-1 min-w-32" defaultValue={view.name} name="name">
        <Label className="sr-only">Name</Label>
        <Input />
      </TextField>
      <SelectField
        clearable
        defaultValue={filters.status ?? undefined}
        label="Status"
        name="status"
        options={VIEW_STATUS_OPTIONS.filter((o) => o.id !== "")}
        placeholder="Any status"
      />
      <SelectField
        clearable
        defaultValue={filters.priority ?? undefined}
        label="Priority"
        name="priority"
        options={VIEW_PRIORITY_OPTIONS.filter((o) => o.id !== "")}
        placeholder="Any priority"
      />
      <TextField
        className="w-28"
        defaultValue={filters.cycleId ?? ""}
        name="cycleId"
      >
        <Label className="sr-only">Cycle id</Label>
        <Input placeholder="Cycle id" />
      </TextField>
      <TextField
        className="w-28"
        defaultValue={filters.assigneeId ?? ""}
        name="assigneeId"
      >
        <Label className="sr-only">Assignee id</Label>
        <Input placeholder="Assignee id" />
      </TextField>
      <TextField
        className="w-28"
        defaultValue={filters.projectId ?? ""}
        name="projectId"
      >
        <Label className="sr-only">Project id</Label>
        <Input placeholder="Project id" />
      </TextField>
      <SelectField
        defaultValue={view.layout}
        label="Layout"
        name="layout"
        options={VIEW_LAYOUT_OPTIONS}
      />
      <Checkbox defaultSelected={view.pinned} name="pinned" value="on">
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Content>
          <Label>Pinned</Label>
        </Checkbox.Content>
      </Checkbox>
      <Button size="sm" type="submit">
        Update
      </Button>
    </Form>
  );
}
