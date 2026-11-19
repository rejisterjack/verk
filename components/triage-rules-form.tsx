"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";
import { SelectField } from "@/components/ui/select-field";

type Option = { id: string; label: string };

export function TriageRulesForm({
  action,
  members,
  labels,
}: {
  action: (formData: FormData) => void | Promise<void>;
  members: Option[];
  labels: Option[];
}) {
  return (
    <Form action={action} className="grid gap-3 sm:grid-cols-2">
      <TextField className="sm:col-span-2" name="titleContains">
        <Label>Title contains</Label>
        <Input placeholder="bug, outage, …" />
      </TextField>
      <SelectField
        clearable
        label="Priority is"
        name="priority"
        options={[
          { id: "URGENT", label: "Urgent" },
          { id: "HIGH", label: "High" },
          { id: "MEDIUM", label: "Medium" },
          { id: "LOW", label: "Low" },
        ]}
        placeholder="Any priority"
      />
      <SelectField
        clearable
        label="Has label"
        name="labelId"
        options={labels}
        placeholder="Any label"
      />
      <SelectField
        clearable
        label="Then assign"
        name="setAssigneeId"
        options={members}
        placeholder="Leave assignee"
      />
      <SelectField
        clearable
        label="Then set status"
        name="setStatus"
        options={[
          { id: "BACKLOG", label: "Backlog" },
          { id: "TODO", label: "Todo" },
          { id: "IN_PROGRESS", label: "In Progress" },
          { id: "DONE", label: "Done" },
          { id: "CANCELLED", label: "Canceled" },
        ]}
        placeholder="Leave status"
      />
      <SelectField
        clearable
        label="Then add label"
        name="addLabelId"
        options={labels}
        placeholder="No extra label"
      />
      <div className="sm:col-span-2">
        <Button size="sm" type="submit">
          Add rule
        </Button>
      </div>
    </Form>
  );
}
