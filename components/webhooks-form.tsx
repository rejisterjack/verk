"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";

export function CreateWebhookForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Form action={action} className="mb-6 flex items-end gap-2">
      <TextField isRequired className="flex-1" name="url" type="url">
        <Label>Webhook URL</Label>
        <Input placeholder="https://example.com/hooks/verk" />
      </TextField>
      <Button type="submit">Add</Button>
    </Form>
  );
}
