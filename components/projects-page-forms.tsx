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
      className="mb-6 flex flex-wrap gap-2 rounded-xl border border-separator p-4"
    >
      <TextField isRequired className="min-w-[200px] flex-1" name="name">
        <Label className="sr-only">Project name</Label>
        <Input placeholder="Project name" />
      </TextField>
      <TextField className="min-w-[200px] flex-[2]" name="summary">
        <Label className="sr-only">Summary</Label>
        <Input placeholder="Summary (optional)" />
      </TextField>
      <Button type="submit">Create project</Button>
    </Form>
  );
}
