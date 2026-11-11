"use client";

import { Checkbox, Form, Input, Label, TextField } from "@heroui/react";

import {
  VIEW_LAYOUT_OPTIONS,
  VIEW_PRIORITY_OPTIONS,
} from "@/components/form-options";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton as Button } from "@/components/submit-button";

type Opt = { id: string; label: string };

const compactInput = "!h-7 !min-h-7 !px-2.5 !py-0 text-[12px] leading-none";

function ViewFilterFields({
  workflows,
  cycles,
  members,
  projects,
  defaults,
}: {
  workflows: Opt[];
  cycles: Opt[];
  members: Opt[];
  projects: Opt[];
  defaults?: {
    workflowStatusId?: string;
    priority?: string;
    cycleId?: string;
    assigneeId?: string;
    projectId?: string;
    layout?: string;
  };
}) {
  return (
    <>
      <SelectField
        clearable
        hideLabel
        defaultValue={defaults?.workflowStatusId}
        label="Status"
        name="workflowStatusId"
        options={workflows}
        placeholder="Any status"
        size="sm"
      />
      <SelectField
        clearable
        hideLabel
        defaultValue={defaults?.priority}
        label="Priority"
        name="priority"
        options={VIEW_PRIORITY_OPTIONS.filter((o) => o.id !== "")}
        placeholder="Any priority"
        size="sm"
      />
      <SelectField
        clearable
        hideLabel
        defaultValue={defaults?.cycleId}
        label="Cycle"
        name="cycleId"
        options={cycles}
        placeholder="Any cycle"
        size="sm"
      />
      <SelectField
        clearable
        hideLabel
        defaultValue={defaults?.assigneeId}
        label="Assignee"
        name="assigneeId"
        options={members}
        placeholder="Any assignee"
        size="sm"
      />
      <SelectField
        clearable
        hideLabel
        defaultValue={defaults?.projectId}
        label="Project"
        name="projectId"
        options={projects}
        placeholder="Any project"
        size="sm"
      />
      <SelectField
        hideLabel
        defaultValue={defaults?.layout ?? "LIST"}
        label="Layout"
        name="layout"
        options={VIEW_LAYOUT_OPTIONS}
        size="sm"
      />
    </>
  );
}

export function CreateViewForm({
  action,
  workflows,
  cycles,
  members,
  projects,
}: {
  action: (formData: FormData) => void | Promise<void>;
  workflows: Opt[];
  cycles: Opt[];
  members: Opt[];
  projects: Opt[];
}) {
  return (
    <Form
      data-compact-form
      action={action}
      className="mb-4 grid gap-2 rounded-lg border border-separator p-3 sm:grid-cols-2"
    >
      <TextField isRequired className="sm:col-span-2" name="name">
        <Label className="sr-only">View name</Label>
        <Input className={compactInput} placeholder="View name" />
      </TextField>
      <ViewFilterFields
        cycles={cycles}
        members={members}
        projects={projects}
        workflows={workflows}
      />
      <div className="sm:col-span-2">
        <Button className="h-7 px-2.5 text-[12px]" size="sm" type="submit">
          Save view
        </Button>
      </div>
    </Form>
  );
}

type ViewFilter = {
  workflowStatusId?: string;
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
  workflows,
  cycles,
  members,
  projects,
}: {
  action: (formData: FormData) => void | Promise<void>;
  view: SavedView;
  workflows: Opt[];
  cycles: Opt[];
  members: Opt[];
  projects: Opt[];
}) {
  const filters = (view.filterJson ?? {}) as ViewFilter;

  return (
    <Form
      data-compact-form
      action={action}
      className="grid gap-2 sm:grid-cols-2"
    >
      <TextField className="sm:col-span-2" defaultValue={view.name} name="name">
        <Label className="sr-only">Name</Label>
        <Input className={compactInput} />
      </TextField>
      <ViewFilterFields
        cycles={cycles}
        defaults={{
          workflowStatusId: filters.workflowStatusId,
          priority: filters.priority,
          cycleId: filters.cycleId,
          assigneeId: filters.assigneeId,
          projectId: filters.projectId,
          layout: view.layout,
        }}
        members={members}
        projects={projects}
        workflows={workflows}
      />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Checkbox defaultSelected={view.pinned} name="pinned" value="on">
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label className="text-[12px]">Pinned</Label>
          </Checkbox.Content>
        </Checkbox>
        <Button className="h-7 px-2.5 text-[12px]" size="sm" type="submit">
          Update
        </Button>
      </div>
    </Form>
  );
}
