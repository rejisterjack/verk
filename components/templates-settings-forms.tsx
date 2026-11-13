"use client";

import { Form, Input, Label, TextArea, TextField } from "@heroui/react";

import {
  TEMPLATE_ESTIMATE_OPTIONS,
  TEMPLATE_PRIORITY_OPTIONS,
} from "@/components/form-options";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton as Button } from "@/components/submit-button";

type Template = {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: string;
  estimate: string;
};

export function CreateTemplateForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Form action={action} className="space-y-2">
      <TextField isRequired name="name">
        <Label>Template name</Label>
        <Input placeholder="Template name" />
      </TextField>
      <TextField isRequired name="title">
        <Label>Issue title</Label>
        <Input placeholder="Issue title" />
      </TextField>
      <TextField name="description">
        <Label>Description</Label>
        <TextArea placeholder="Description" />
      </TextField>
      <SelectField
        defaultValue="NONE"
        label="Priority"
        name="priority"
        options={TEMPLATE_PRIORITY_OPTIONS}
      />
      <SelectField
        defaultValue="NONE"
        label="Estimate"
        name="estimate"
        options={TEMPLATE_ESTIMATE_OPTIONS}
      />
      <Button type="submit">Save template</Button>
    </Form>
  );
}

export function UpdateTemplateForm({
  action,
  template,
}: {
  action: (formData: FormData) => void | Promise<void>;
  template: Template;
}) {
  return (
    <Form action={action} className="space-y-2">
      <TextField isRequired defaultValue={template.name} name="name">
        <Label>Template name</Label>
        <Input />
      </TextField>
      <TextField isRequired defaultValue={template.title} name="title">
        <Label>Issue title</Label>
        <Input />
      </TextField>
      <TextField defaultValue={template.description} name="description">
        <Label>Description</Label>
        <TextArea />
      </TextField>
      <SelectField
        defaultValue={template.priority}
        label="Priority"
        name="priority"
        options={TEMPLATE_PRIORITY_OPTIONS}
      />
      <SelectField
        defaultValue={template.estimate}
        label="Estimate"
        name="estimate"
        options={TEMPLATE_ESTIMATE_OPTIONS}
      />
      <Button size="sm" type="submit">
        Update
      </Button>
    </Form>
  );
}
