"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";

export function CreateProjectForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form
      action={action}
      className="mb-6 grid gap-3 rounded-xl border border-separator p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
    >
      <TextField isRequired fullWidth name="name">
        <Label>Project name</Label>
        <Input placeholder="Launch Verk" />
      </TextField>
      <TextField fullWidth name="summary">
        <Label>Summary</Label>
        <Input placeholder="Optional summary" />
      </TextField>
      <Button type="submit">Create project</Button>
    </Form>
  );
}
