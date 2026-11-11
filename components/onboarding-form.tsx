"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";

export function OnboardingForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Form action={action} className="flex flex-col gap-4">
      <TextField isRequired name="name">
        <Label>Team name</Label>
        <Input placeholder="Acme Engineering" />
      </TextField>
      <TextField name="slug">
        <Label>Slug (optional)</Label>
        <Input placeholder="acme-engineering" />
      </TextField>
      <Button type="submit">Create team</Button>
    </Form>
  );
}
