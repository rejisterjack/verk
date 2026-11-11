"use client";

import { Checkbox, CheckboxGroup, Label } from "@heroui/react";

import { groupLabels } from "@/lib/labels";

type LabelOpt = {
  id: string;
  name: string;
  color: string;
  group?: string | null;
};

export function LabelChecklist({
  labels,
  name,
  selected,
  onToggle,
}: {
  labels: LabelOpt[];
  name?: string;
  selected?: ReadonlySet<string>;
  onToggle?: (id: string, checked: boolean) => void;
}) {
  const groups = groupLabels(labels);
  const controlled = Boolean(onToggle);

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const groupIds = group.labels.map((label) => label.id);
        const groupValue = controlled
          ? groupIds.filter((id) => selected?.has(id))
          : undefined;

        return (
          <CheckboxGroup
            key={group.name || "all"}
            name={name}
            {...(controlled
              ? {
                  value: groupValue,
                  onChange: (values: string[]) => {
                    if (!onToggle) return;
                    for (const id of groupIds) {
                      const next = values.includes(id);
                      const prev = selected?.has(id) ?? false;

                      if (next !== prev) onToggle(id, next);
                    }
                  },
                }
              : {})}
          >
            <Label>{group.name || "Labels"}</Label>
            {group.labels.map((label) => (
              <Checkbox key={label.id} value={label.id}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span
                    aria-hidden
                    className="inline-block size-2 rounded-full"
                    style={{ background: label.color }}
                  />
                  {label.name}
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
        );
      })}
    </div>
  );
}
