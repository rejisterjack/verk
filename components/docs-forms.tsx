"use client";

import { Form, Input, Label, TextArea, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";

export function CreateDocumentForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form action={action} className="space-y-2">
      <TextField isRequired name="title">
        <Label>Title</Label>
        <Input placeholder="Title" />
      </TextField>
      <TextField name="body">
        <Label>Body</Label>
        <TextArea placeholder="Markdown" />
      </TextField>
      <Button type="submit">Save document</Button>
    </Form>
  );
}

export function UpdateDocumentForm({
  action,
  title,
  body,
}: {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  body: string;
}) {
  return (
    <Form action={action} className="mt-3 space-y-2">
      <TextField isRequired defaultValue={title} name="title">
        <Label>Title</Label>
        <Input />
      </TextField>
      <TextField defaultValue={body} name="body">
        <Label>Body</Label>
        <TextArea />
      </TextField>
      <Button size="sm" type="submit">
        Update
      </Button>
    </Form>
  );
}
