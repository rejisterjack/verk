"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { ISSUE_FILTER_PRIORITY_OPTIONS } from "@/components/form-options";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton as Button } from "@/components/submit-button";

type Workflow = { id: string; name: string };
type Cycle = { id: string; name: string };

export function IssueFiltersForm({
  search,
  workflowStatusId,
  priority,
  cycleId,
  labelGroup,
  workflows,
  cycles,
  activeCycleId,
  labelGroups,
  hidden,
}: {
  search?: string;
  workflowStatusId?: string;
  priority?: string;
  cycleId?: string;
  labelGroup?: string;
  workflows: Workflow[];
  cycles: Cycle[];
  activeCycleId?: string;
  labelGroups: string[];
  hidden: {
    assignee?: string;
    layout?: string;
    view?: string;
    group?: string;
  };
}) {
  const cycleOptions = [
    ...(activeCycleId
      ? [{ id: activeCycleId, label: "Active cycle" as const }]
      : []),
    ...cycles
      .filter((c) => c.id !== activeCycleId)
      .map((c) => ({ id: c.id, label: c.name })),
  ];

  return (
    <Form
      className="flex flex-wrap items-end gap-2"
      data-issue-filters
      method="get"
    >
      {hidden.assignee ? (
        <input name="assignee" type="hidden" value={hidden.assignee} />
      ) : null}
      {hidden.layout ? (
        <input name="layout" type="hidden" value={hidden.layout} />
      ) : null}
      {hidden.view ? <input name="view" type="hidden" value={hidden.view} /> : null}
      {hidden.group ? (
        <input name="group" type="hidden" value={hidden.group} />
      ) : null}
      <TextField
        defaultValue={search ?? ""}
        id="issue-filter-search"
        name="search"
      >
        <Label className="sr-only">Search</Label>
        <Input placeholder="Search…" />
      </TextField>
      <SelectField
        clearable
        defaultValue={workflowStatusId ?? undefined}
        label="Workflow status"
        name="workflowStatusId"
        options={workflows.map((w) => ({ id: w.id, label: w.name }))}
        placeholder="All workflow statuses"
      />
      <SelectField
        clearable
        defaultValue={priority ?? undefined}
        label="Priority"
        name="priority"
        options={ISSUE_FILTER_PRIORITY_OPTIONS.filter((o) => o.id !== "")}
        placeholder="All priorities"
      />
      <SelectField
        clearable
        defaultValue={cycleId ?? undefined}
        label="Cycle"
        name="cycleId"
        options={cycleOptions}
        placeholder="All cycles"
      />
      {labelGroups.length ? (
        <SelectField
          clearable
          defaultValue={labelGroup ?? undefined}
          label="Label group"
          name="labelGroup"
          options={labelGroups.map((group) => ({ id: group, label: group }))}
          placeholder="All label groups"
        />
      ) : null}
      <Button type="submit">Filter</Button>
    </Form>
  );
}

export function SaveViewForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form action={action} className="flex gap-1">
      <TextField className="w-36" name="name">
        <Label className="sr-only">View name</Label>
        <Input placeholder="Save as view…" />
      </TextField>
      <Button size="sm" type="submit" variant="secondary">
        Save
      </Button>
    </Form>
  );
}
