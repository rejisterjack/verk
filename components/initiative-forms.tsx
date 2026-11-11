"use client";

import { DateField, Form, Input, Label, TextField } from "@heroui/react";
import { parseDate } from "@internationalized/date";

import { INITIATIVE_HEALTH_OPTIONS, isoDateOnly } from "@/components/form-options";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton as Button } from "@/components/submit-button";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";

export function CreateInitiativeForm({
  action,
  className,
  submitLabel,
  variant,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  submitLabel: string;
  variant?: ButtonVariant;
}) {
  return (
    <Form action={action} className={className ?? "flex flex-wrap items-center gap-2"}>
      <TextField isRequired className="min-w-[240px] flex-1" name="name">
        <Label className="sr-only">Name</Label>
        <Input placeholder="e.g. Q4 Mobile App Launch" />
      </TextField>
      <DateField defaultValue={null} name="targetDate">
        <Label className="sr-only">Target date</Label>
        <DateField.Group>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <Button size="sm" type="submit" variant={variant}>
        {submitLabel}
      </Button>
    </Form>
  );
}

export function EditInitiativeForm({
  action,
  name,
  health,
  targetDate,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  name: string;
  health: string;
  targetDate: Date | null;
  className?: string;
}) {
  const target = isoDateOnly(targetDate);

  return (
    <Form
      action={action}
      className={className ?? "flex flex-wrap items-center gap-2 text-xs"}
    >
      <TextField
        isRequired
        className="w-36 sm:w-44"
        defaultValue={name}
        name="name"
      >
        <Label className="sr-only">Name</Label>
        <Input />
      </TextField>
      <DateField
        defaultValue={target ? parseDate(target) : null}
        name="targetDate"
      >
        <Label className="sr-only">Target date</Label>
        <DateField.Group>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <SelectField
        defaultValue={health}
        label="Health"
        name="health"
        options={INITIATIVE_HEALTH_OPTIONS}
      />
      <Button size="sm" type="submit" variant="ghost">
        Update
      </Button>
    </Form>
  );
}

export function EditInitiativeInlineForm({
  action,
  name,
  health,
  targetDate,
  projectCount,
}: {
  action: (formData: FormData) => void | Promise<void>;
  name: string;
  health: string;
  targetDate: Date | null;
  projectCount: number;
}) {
  const target = isoDateOnly(targetDate);

  return (
    <Form
      action={action}
      className="flex flex-1 flex-wrap items-center gap-2 text-xs"
    >
      <TextField
        isRequired
        className="min-w-[160px] flex-1"
        defaultValue={name}
        name="name"
      >
        <Label className="sr-only">Name</Label>
        <Input />
      </TextField>
      <DateField
        defaultValue={target ? parseDate(target) : null}
        name="targetDate"
      >
        <Label className="sr-only">Target date</Label>
        <DateField.Group>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <SelectField
        defaultValue={health}
        label="Health"
        name="health"
        options={INITIATIVE_HEALTH_OPTIONS}
      />
      <span className="text-muted">
        {projectCount} {projectCount === 1 ? "project" : "projects"}
      </span>
      <Button size="sm" type="submit" variant="ghost">
        Save
      </Button>
    </Form>
  );
}
