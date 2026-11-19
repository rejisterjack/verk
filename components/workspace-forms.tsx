"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";

export function RenameWorkspaceForm({
  action,
  name,
}: {
  action: (formData: FormData) => Promise<void>;
  name: string;
}) {
  return (
    <Form action={action} className="mb-4 flex items-end gap-2">
      <TextField className="flex-1" defaultValue={name} name="name">
        <Label>Workspace name</Label>
        <Input />
      </TextField>
      <Button type="submit">Rename</Button>
    </Form>
  );
}

export function AddWorkspaceTeamForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Form action={action} className="mb-6 flex items-end gap-2">
      <TextField isRequired className="flex-1" name="name">
        <Label>Team name</Label>
        <Input placeholder="New team name" />
      </TextField>
      <Button type="submit">Add team</Button>
    </Form>
  );
}
