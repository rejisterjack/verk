"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";

const compactInput = "!h-7 !min-h-7 !px-2.5 !py-0 text-[12px] leading-none";

export function CreateProjectForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form
      action={action}
      className="mb-4 grid gap-3 rounded-lg border border-separator p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
    >
      <TextField fullWidth isRequired name="name">
        <Label className="text-[12px] text-muted">Project name</Label>
        <Input className={compactInput} placeholder="Launch Verk" />
      </TextField>
      <TextField fullWidth name="summary">
        <Label className="text-[12px] text-muted">Summary</Label>
        <Input className={compactInput} placeholder="Optional summary" />
      </TextField>
      <Button className="h-7 px-2.5 text-[12px]" size="sm" type="submit">
        Create project
      </Button>
    </Form>
  );
}
