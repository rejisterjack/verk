"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";

export function ImportApiForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form action={action} className="space-y-3">
      <TextField isRequired name="apiKey" type="password">
        <Label>Linear API key</Label>
        <Input placeholder="lin_api_…" />
      </TextField>
      <TextField name="teamKey">
        <Label>Linear team key (optional)</Label>
        <Input placeholder="Optional Linear team key filter (e.g. ENG)" />
      </TextField>
      <Button type="submit" variant="secondary">
        Import from API
      </Button>
    </Form>
  );
}
