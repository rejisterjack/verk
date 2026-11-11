"use client";

import { Checkbox, DateField, Form, Input, Label, TextField } from "@heroui/react";
import { parseDate } from "@internationalized/date";

import { isoDateOnly } from "@/components/form-options";
import { SubmitButton as Button } from "@/components/submit-button";

export function CreateCycleForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form
      action={action}
      className="grid gap-3 rounded-xl border border-separator p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <TextField
        isRequired
        className="lg:col-span-2"
        name="name"
      >
        <Label>Name</Label>
        <Input placeholder="Cycle 2" />
      </TextField>
      <DateField isRequired defaultValue={null} name="startDate">
        <Label>Start</Label>
        <DateField.Group>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <DateField isRequired defaultValue={null} name="endDate">
        <Label>End</Label>
        <DateField.Group>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <div className="flex items-end gap-3">
        <Checkbox name="isActive" value="on">
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label>Active</Label>
          </Checkbox.Content>
        </Checkbox>
        <Button type="submit">Create</Button>
      </div>
    </Form>
  );
}

export function UpdateCycleForm({
  action,
  cycle,
}: {
  action: (formData: FormData) => void | Promise<void>;
  cycle: {
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  };
}) {
  const start = isoDateOnly(cycle.startDate);
  const end = isoDateOnly(cycle.endDate);

  return (
    <Form
      action={action}
      className="grid gap-3 rounded-xl border border-separator p-4 sm:grid-cols-2"
    >
      <TextField className="sm:col-span-2" defaultValue={cycle.name} name="name">
        <Label>Name</Label>
        <Input />
      </TextField>
      <DateField
        defaultValue={start ? parseDate(start) : null}
        name="startDate"
      >
        <Label>Start</Label>
        <DateField.Group>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <DateField defaultValue={end ? parseDate(end) : null} name="endDate">
        <Label>End</Label>
        <DateField.Group>
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <Checkbox
        defaultSelected={cycle.isActive}
        name="isActive"
        value="on"
      >
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Content>
          <Label>Active cycle</Label>
        </Checkbox.Content>
      </Checkbox>
      <div>
        <Button type="submit">Save</Button>
      </div>
    </Form>
  );
}
