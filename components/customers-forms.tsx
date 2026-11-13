"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SelectField } from "@/components/ui/select-field";
import { SubmitButton as Button } from "@/components/submit-button";

type IssueOpt = { number: number; title: string };

const compactInput = "!h-7 !min-h-7 !px-2.5 !py-0 text-[12px] leading-none";

export function CreateCustomerForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form action={action} className="flex h-7 flex-wrap items-center gap-2">
      <TextField isRequired name="name">
        <Label className="sr-only">Name</Label>
        <Input className={compactInput} placeholder="Name" />
      </TextField>
      <TextField name="domain">
        <Label className="sr-only">Domain</Label>
        <Input className={compactInput} placeholder="domain.com" />
      </TextField>
      <Button className="h-7 px-2.5 text-[12px]" size="sm" type="submit">
        Add
      </Button>
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
    <Form action={action} className="flex flex-wrap items-center gap-2">
      <TextField isRequired className="min-w-40 flex-1" name="body">
        <Label className="sr-only">Request</Label>
        <Input className={compactInput} placeholder="Request" />
      </TextField>
      <SelectField
        clearable
        hideLabel
        className="w-48"
        fullWidth={false}
        label="Issue"
        name="issueNumber"
        options={issues.map((issue) => ({
          id: String(issue.number),
          label: `#${issue.number} ${issue.title}`,
        }))}
        placeholder="No issue"
        size="sm"
      />
      <Button className="h-7 px-2.5 text-[12px]" size="sm" type="submit">
        Link
      </Button>
    </Form>
  );
}
