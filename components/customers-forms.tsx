"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SelectField } from "@/components/ui/select-field";
import { SubmitButton as Button } from "@/components/submit-button";

type IssueOpt = { number: number; title: string };

export function CreateCustomerForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form action={action} className="flex flex-wrap gap-2">
      <TextField isRequired name="name">
        <Label className="sr-only">Name</Label>
        <Input placeholder="Name" />
      </TextField>
      <TextField name="domain">
        <Label className="sr-only">Domain</Label>
        <Input placeholder="domain.com" />
      </TextField>
      <Button type="submit">Add</Button>
    </Form>
  );
}

export function LinkCustomerRequestForm({
  action,
  issues,
}: {
  action: (formData: FormData) => void | Promise<void>;
  issues: IssueOpt[];
}) {
  return (
    <Form action={action} className="flex flex-wrap gap-2">
      <TextField isRequired className="flex-1 min-w-40" name="body">
        <Label className="sr-only">Request</Label>
        <Input placeholder="Request" />
      </TextField>
      <SelectField
        clearable
        label="Issue"
        name="issueNumber"
        options={issues.map((issue) => ({
          id: String(issue.number),
          label: `#${issue.number} ${issue.title}`,
        }))}
        placeholder="No issue"
      />
      <Button size="sm" type="submit">
        Link
      </Button>
    </Form>
  );
}
