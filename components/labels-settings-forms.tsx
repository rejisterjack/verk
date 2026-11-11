"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";

export function CreateLabelForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Form action={action} className="mb-6 flex flex-wrap items-end gap-2">
      <TextField isRequired className="flex-1" name="name">
        <Label>Name</Label>
        <Input placeholder="bug" />
      </TextField>
      <TextField className="w-28" name="group">
        <Label>Group</Label>
        <Input placeholder="group" />
      </TextField>
      <TextField defaultValue="#0f766e" name="color" type="color">
        <Label>Color</Label>
        <Input />
      </TextField>
      <Button type="submit">Add</Button>
    </Form>
  );
}

export function RenameLabelForm({
  action,
  id,
  name,
  group,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  name: string;
  group: string | null;
}) {
  return (
    <Form action={action} className="flex flex-1 items-end gap-2">
      <input name="id" type="hidden" value={id} />
      <TextField className="flex-1" defaultValue={name} name="name">
        <Label>Name</Label>
        <Input />
      </TextField>
      <TextField
        className="w-28"
        defaultValue={group ?? ""}
        name="group"
      >
        <Label>Group</Label>
        <Input placeholder="group" />
      </TextField>
      <Button size="sm" type="submit" variant="ghost">
        Rename
      </Button>
    </Form>
  );
}
