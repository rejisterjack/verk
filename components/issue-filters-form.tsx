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
    <form
      data-issue-filters
      className="flex flex-wrap items-center gap-1.5"
      method="get"
      onChange={(event) => {
        const target = event.target as HTMLElement;

        if (
          target.tagName === "SELECT" ||
          target.getAttribute("role") === "combobox"
        ) {
          event.currentTarget.requestSubmit();
        }
      }}
    >
      {hidden.assignee ? (
        <input name="assignee" type="hidden" value={hidden.assignee} />
      ) : null}
      {hidden.layout ? (
        <input name="layout" type="hidden" value={hidden.layout} />
      ) : null}
      {hidden.view ? (
        <input name="view" type="hidden" value={hidden.view} />
      ) : null}
      {hidden.group ? (
        <input name="group" type="hidden" value={hidden.group} />
      ) : null}
      <TextField
        className="w-36"
        defaultValue={search ?? ""}
        id="issue-filter-search"
        name="search"
      >
        <Label className="sr-only">Filter</Label>
        <Input
          className="!h-7 !min-h-7 !px-2.5 !py-0 text-[12px] leading-none"
          placeholder="Filter…"
        />
      </TextField>
      <SelectField
        clearable
        hideLabel
        className="w-32"
        defaultValue={workflowStatusId ?? undefined}
        fullWidth={false}
        label="Status"
        name="workflowStatusId"
        options={workflows.map((w) => ({ id: w.id, label: w.name }))}
        placeholder="Status"
        size="sm"
      />
      <SelectField
        clearable
        hideLabel
        className="w-32"
        defaultValue={priority ?? undefined}
        fullWidth={false}
        label="Priority"
        name="priority"
        options={ISSUE_FILTER_PRIORITY_OPTIONS.filter((o) => o.id !== "")}
        placeholder="Priority"
        size="sm"
      />
      <SelectField
        clearable
        hideLabel
        className="w-36"
        defaultValue={cycleId ?? undefined}
        fullWidth={false}
        label="Cycle"
        name="cycleId"
        options={cycleOptions}
        placeholder="Cycle"
        size="sm"
      />
      {labelGroups.length ? (
        <SelectField
          clearable
          hideLabel
          className="w-32"
          defaultValue={labelGroup ?? undefined}
          fullWidth={false}
          label="Label group"
          name="labelGroup"
          options={labelGroups.map((group) => ({ id: group, label: group }))}
          placeholder="Labels"
          size="sm"
        />
      ) : null}
      <Button
        className="h-7 px-2 text-[12px]"
        size="sm"
        type="submit"
        variant="ghost"
      >
        Apply
      </Button>
    </form>
  );
}

export function SaveViewForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form action={action} className="flex h-7 items-center gap-1">
      <TextField className="w-32" name="name">
        <Label className="sr-only">View name</Label>
        <Input
          className="!h-7 !min-h-7 !px-2.5 !py-0 text-[12px] leading-none"
          placeholder="Save view…"
        />
      </TextField>
      <Button
        className="h-7 px-2 text-[12px]"
        size="sm"
        type="submit"
        variant="ghost"
      >
        Save
      </Button>
    </Form>
  );
}
