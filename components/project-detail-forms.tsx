"use client";

import {
  DateField,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";

import {
  INITIATIVE_HEALTH_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  isoDateOnly,
} from "@/components/form-options";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton as Button } from "@/components/submit-button";

type Member = {
  user: { id: string; name: string | null; email: string };
};

type Initiative = { id: string; name: string };

export function ProjectSettingsForm({
  action,
  project,
  members,
  initiatives,
}: {
  action: (formData: FormData) => void | Promise<void>;
  project: {
    name: string;
    summary: string;
    status: string;
    leadId: string | null;
    initiativeId: string | null;
    targetDate: Date | null;
  };
  members: Member[];
  initiatives: Initiative[];
}) {
  const target = isoDateOnly(project.targetDate);

  return (
    <Form
      action={action}
      className="mb-8 space-y-2 rounded-xl border border-separator p-4"
    >
      <TextField isRequired defaultValue={project.name} name="name">
        <Label>Name</Label>
        <Input />
      </TextField>
      <TextField defaultValue={project.summary} name="summary">
        <Label>Summary</Label>
        <TextArea />
      </TextField>
      <SelectField
        defaultValue={project.status}
        label="Status"
        name="status"
        options={PROJECT_STATUS_OPTIONS}
      />
      <SelectField
        clearable
        defaultValue={project.leadId ?? undefined}
        label="Lead"
        name="leadId"
        options={members.map((member) => ({
          id: member.user.id,
          label: member.user.name ?? member.user.email,
        }))}
        placeholder="No lead"
      />
      <SelectField
        clearable
        defaultValue={project.initiativeId ?? undefined}
        label="Initiative"
        name="initiativeId"
        options={initiatives.map((item) => ({ id: item.id, label: item.name }))}
        placeholder="No initiative"
      />
      <DateField
        defaultValue={target ? parseDate(target) : null}
        name="targetDate"
      >
        <Label>Target date</Label>
        <DateField.Group>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <Button type="submit">Save project</Button>
    </Form>
  );
}

export function AddMilestoneForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form
      data-compact-form
      action={action}
      className="mt-3 flex flex-wrap items-center gap-2"
    >
      <TextField className="min-w-40 flex-1" name="name">
        <Label className="sr-only">Name</Label>
        <Input
          className="!h-7 !min-h-7 !px-2.5 !py-0 text-[12px] leading-none"
          placeholder="New milestone"
        />
      </TextField>
      <DateField defaultValue={null} name="targetDate">
        <Label className="sr-only">Target date</Label>
        <DateField.Group className="!h-7 !min-h-7 !max-h-7 !overflow-hidden !px-2.5 !py-0 text-[12px]">
          <DateField.Input className="!h-7 !min-h-0 !py-0">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <Button
        className="h-7 px-2.5 text-[12px]"
        size="sm"
        type="submit"
        variant="tertiary"
      >
        Add
      </Button>
    </Form>
  );
}

export function PostProjectUpdateForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form action={action} className="mt-2 space-y-2">
      <TextField isRequired name="body">
        <Label>Update</Label>
        <TextArea />
      </TextField>
      <SelectField
        defaultValue="ON_TRACK"
        label="Health"
        name="health"
        options={INITIATIVE_HEALTH_OPTIONS}
      />
      <Button type="submit">Post update</Button>
    </Form>
  );
}
