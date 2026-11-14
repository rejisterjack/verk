"use client";

import { useMemo, useState } from "react";

import { SubmitButton as Button } from "@/components/submit-button";

type Template = {
  id: string;
  name: string;
  priority: string;
  estimate: string;
  labelId: string | null;
  labelName?: string | null;
};

const fieldClass =
  "mt-1 block h-8 w-full rounded-md border border-separator bg-background px-2 text-[13px] text-foreground";

export function IntakeForm({
  action,
  templates,
}: {
  action: (formData: FormData) => void | Promise<void>;
  templates: Template[];
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const selected = useMemo(
    () => templates.find((template) => template.id === templateId),
    [templateId, templates],
  );
  const [priority, setPriority] = useState(selected?.priority ?? "NONE");
  const [estimate, setEstimate] = useState(selected?.estimate ?? "NONE");

  function choose(id: string) {
    const next = templates.find((template) => template.id === id);

    setTemplateId(id);
    setPriority(next?.priority ?? "NONE");
    setEstimate(next?.estimate ?? "NONE");
  }

  return (
    <form action={action} className="max-w-lg space-y-3 px-4 py-4">
      <label className="block text-[12px] text-muted">
        Template
        <select
          className={fieldClass}
          name="templateId"
          value={templateId}
          onChange={(event) => choose(event.target.value)}
        >
          <option value="">None</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
      {selected?.labelName ? (
        <p className="text-[12px] text-muted">Label: {selected.labelName}</p>
      ) : null}
      <label className="block text-[12px] text-muted">
        Priority
        <select
          className={fieldClass}
          name="priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        >
          {["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[12px] text-muted">
        Estimate
        <select
          className={fieldClass}
          name="estimate"
          value={estimate}
          onChange={(event) => setEstimate(event.target.value)}
        >
          {["NONE", "XS", "S", "M", "L", "XL", "XXL"].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[12px] text-muted">
        Detail
        <textarea
          className="mt-1 block w-full rounded-md border border-separator bg-background px-2 py-1 text-[13px] text-foreground"
          name="detail"
          rows={4}
        />
      </label>
      <label className="block text-[12px] text-muted">
        Customer
        <input className={fieldClass} name="customer" placeholder="Optional" />
      </label>
      <Button size="sm" type="submit">
        Create issue
      </Button>
    </form>
  );
}
