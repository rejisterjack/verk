"use client";

import { Form, Input, Label, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";

const compactInput = "!h-7 !min-h-7 !px-2.5 !py-0 text-[12px] leading-none";

export function CreateLabelForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Form
      data-compact-form
      action={action}
      className="mb-4 flex flex-wrap items-end gap-2"
    >
      <TextField isRequired className="min-w-32 flex-1" name="name">
        <Label className="text-[12px] text-muted">Name</Label>
        <Input className={compactInput} placeholder="bug" />
      </TextField>
      <TextField className="w-28" name="group">
        <Label className="text-[12px] text-muted">Group</Label>
        <Input className={compactInput} placeholder="group" />
      </TextField>
      <TextField defaultValue="#0f766e" name="color" type="color">
        <Label className="text-[12px] text-muted">Color</Label>
        <Input className="!h-7 !min-h-7 !w-12 !p-0.5" />
      </TextField>
      <Button className="h-7 px-2.5 text-[12px]" size="sm" type="submit">
        Add
      </Button>
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
    <Form
      data-compact-form
      action={action}
      className="flex flex-1 flex-wrap items-end gap-2"
    >
      <input name="id" type="hidden" value={id} />
      <TextField className="min-w-32 flex-1" defaultValue={name} name="name">
        <Label className="sr-only">Name</Label>
        <Input className={compactInput} />
      </TextField>
      <TextField className="w-28" defaultValue={group ?? ""} name="group">
        <Label className="sr-only">Group</Label>
        <Input className={compactInput} placeholder="group" />
      </TextField>
      <Button
        className="h-7 px-2 text-[12px]"
        size="sm"
        type="submit"
        variant="ghost"
      >
        Rename
      </Button>
    </Form>
  );
}
